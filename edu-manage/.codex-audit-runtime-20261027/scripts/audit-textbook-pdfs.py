"""Inventory local textbook PDFs and extract *unverified* table-of-contents leads.

This is deliberately not a production importer. A filename, an OCR result, or
an AI-generated list cannot establish a book's edition or chapter accuracy.

Usage:
  python scripts/audit-textbook-pdfs.py --root D:/01muzhexuetang/muzhexuetang \
      --output data/textbooks/local-catalog-draft.json
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

from pypdf import PdfReader


SUBJECTS = ("道德与法治", "思想政治", "生物", "数学", "语文", "英语", "物理", "化学", "历史", "地理")
HEADING = re.compile(
    r"(?:第\s*[一二三四五六七八九十百\d]+\s*(?:单元|章|节|课|篇)"
    r"|(?:Starter\s+)?Unit\s*\d+|\d+\.\d+\s+\S|课题\s*\d+)",
    re.IGNORECASE,
)
GARBLED = re.compile(r"/G[0-9A-F]{2}")
EDITION_MARKERS = {
    "冀少版": ("河北少年儿童出版社",),
    "冀教版": ("河北教育出版社", "河北省教育科学研究院"),
    "人教版/统编": ("人民教育出版社", "教育部组织编写"),
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def infer_subject(path: Path) -> str | None:
    return next((subject for subject in SUBJECTS if subject in path.name), None)


def infer_grade(path: Path) -> str | None:
    # High-school files are copied under both 高一 and 高二 folders regardless
    # of the actual 必修/选择性必修 volume. The folder is not a grade assignment.
    if "高中" in path.name or "必修" in path.name or "选修" in path.name:
        return None
    for label in ("七年级", "八年级", "九年级", "高一", "高二", "高三"):
        if label in path.name:
            return label
    return None


def clean_heading(line: str) -> str:
    line = re.sub(r"[·…\.]{3,}.*$", "", line)
    line = re.sub(r"\s+\d+\s*$", "", line)
    return re.sub(r"\s+", " ", line).strip(" \t·….-")[:120]


def inspect(path: Path, root: Path, file_hash: str) -> dict:
    result = {
        "source": path.relative_to(root).as_posix(),
        "sha256": file_hash,
        "subject_hint": infer_subject(path),
        "grade_hint": infer_grade(path),
        "volume_hint": next((part for part in ("选择性必修", "必修", "九年级全一册", "上册", "下册") if part in path.name), None),
        "status": "needs_human_verification",
        "toc_candidates": [],
    }
    if result["grade_hint"] == "九年级" and result["subject_hint"] == "英语" and "全一册" in path.name:
        result["status"] = "known_stale_do_not_import"
        result["status_reason"] = "人教社介绍新修订九年级英语分上、下册；本地文件仍为旧全一册。"
    elif result["grade_hint"] == "九年级" and result["subject_hint"] == "语文":
        result["status"] = "suspected_stale_do_not_import"
        result["status_reason"] = "本地九年级上册封面含2022时间标记，2026年统编修订版已完成年级替换；须逐册核对。"
    try:
        reader = PdfReader(path)
        result["pages"] = len(reader.pages)
        pages = [(index + 1, reader.pages[index].extract_text() or "") for index in range(min(14, len(reader.pages)))]
    except Exception as exc:  # Keep the rest of the audit usable.
        result["error"] = f"{type(exc).__name__}: {str(exc)[:180]}"
        return result

    front_matter = "\n".join(text for _, text in pages[:4])
    result["publisher_markers"] = [
        label for label, markers in EDITION_MARKERS.items()
        if any(marker in front_matter for marker in markers)
    ]
    result["front_matter_years"] = sorted(set(re.findall(r"20(?:1\d|2[0-6])年", front_matter)))
    result["garbled_text"] = sum(len(GARBLED.findall(text)) for _, text in pages) > 25

    # TOCs in these books usually begin on pages 4-6. Keep only title-like
    # lines from the early pages; never treat OCR candidates as verified data.
    candidate_pages = []
    for index, (_, text) in enumerate(pages):
        normalized = re.sub(r"\s+", "", text).lower()
        if "目录" in normalized or "contents" in normalized:
            candidate_pages.extend(range(index, min(index + 6, len(pages))))
    if not candidate_pages:
        candidate_pages = list(range(3, min(9, len(pages))))
    seen = set()
    for page_index in sorted(set(candidate_pages)):
        page_number, page_text = pages[page_index]
        if len(GARBLED.findall(page_text)) > 20:
            continue
        for raw_line in page_text.splitlines():
            line = clean_heading(raw_line)
            if not HEADING.search(line) or len(line) > 100 or line in seen:
                continue
            seen.add(line)
            result["toc_candidates"].append({"text": line, "pdf_page": page_number})
    if result["status"].endswith("_do_not_import"):
        # Keep the source fingerprint for traceability, but never carry old
        # chapter candidates forward into a future review/import workflow.
        result["toc_candidates"] = []
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    root = args.root.resolve()
    if not root.is_dir():
        parser.error(f"Missing source root: {root}")
    sources = sorted(
        path for folder in root.glob("100[1-8]、*") if folder.is_dir()
        for path in folder.rglob("*.pdf")
        if "课本" in str(path)
    )
    hashes: set[str] = set()
    books = []
    duplicate_count = 0
    for path in sources:
        file_hash = sha256(path)
        if file_hash in hashes:
            duplicate_count += 1
            continue
        hashes.add(file_hash)
        books.append(inspect(path, root, file_hash))
    report = {
        "schema": "textbook-local-audit-v1",
        "warning": "Unverified extraction leads only; do not expose to students or use for AI grounding.",
        "source_root": str(root),
        "duplicate_copies_skipped": duplicate_count,
        "books": books,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "source_files": len(sources),
        "unique_books": len(books),
        "duplicate_copies_skipped": duplicate_count,
        "with_toc_candidates": sum(bool(book["toc_candidates"]) for book in books),
        "garbled_text": sum(bool(book.get("garbled_text")) for book in books),
        "output": str(args.output),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
