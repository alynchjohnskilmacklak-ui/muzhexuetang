#!/usr/bin/env python3
"""Recover answer keys and explanations from matching teacher-version DOCX files."""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

from docx import Document


ANSWER_PAIR = re.compile(r"(\d+)\s*[.．、]\s*([A-F])(?=\s|$)")
NUMBERED_LINE = re.compile(r"^\s*(\d+)\s*[.．、]\s*(.*)$")
ANSWER_MARKER = re.compile(r"【(?:答案|详解|解析)】")
UNRESOLVED_IMAGE = re.compile(r"\[图片引用[:：][^\]]*\]")


def clean_marked_text(value: str) -> str:
    return ANSWER_MARKER.split(value, maxsplit=1)[0].strip()


def normalized(value: str) -> str:
    value = re.sub(r"<[^>]*>", "", value or "")
    value = clean_marked_text(value)
    value = unicodedata.normalize("NFKC", value).casefold()
    return "".join(char for char in value if char.isalnum() or "\u3400" <= char <= "\u9fff")


def parse_answer_line(value: str) -> dict[int, str]:
    content = value.split("【答案】", 1)[1].strip() if "【答案】" in value else value.strip()
    range_match = re.fullmatch(r"(\d+)\s*[-—~至]\s*(\d+)\s*([A-F]+)", content)
    if range_match:
        start, end, letters = int(range_match.group(1)), int(range_match.group(2)), range_match.group(3)
        if end - start + 1 == len(letters):
            return {start + offset: letter for offset, letter in enumerate(letters)}

    matches = list(ANSWER_PAIR.finditer(content))
    residue = ANSWER_PAIR.sub("", content).strip(" \t,，;；:：.。")
    if matches and not residue:
        return {int(match.group(1)): match.group(2) for match in matches}
    return {}


def scan_document(lines: list[str]) -> tuple[dict[int, tuple[str, int]], list[int | None]]:
    answers: dict[int, tuple[str, int]] = {}
    current_number: int | None = None
    number_at_line: list[int | None] = []

    for index, line in enumerate(lines):
        explicit_answers = parse_answer_line(line)
        if explicit_answers:
            answers.update({number: (letter, index) for number, letter in explicit_answers.items()})
            number_at_line.append(current_number)
            continue

        numbered = NUMBERED_LINE.match(line)
        if numbered and not any(marker in line for marker in ("【答案】", "【详解】", "【解析】")):
            number, rest = int(numbered.group(1)), numbered.group(2).strip()
            if len(rest) == 1 and rest.upper() in "ABCDEF":
                answers[number] = (rest.upper(), index)
            else:
                current_number = number

        if "【答案】" in line and current_number is not None:
            answer = line.split("【答案】", 1)[1].strip()
            single_letter = re.fullmatch(r"([A-F])(?:[.。])?", answer)
            if single_letter:
                answers[current_number] = (single_letter.group(1), index)

        number_at_line.append(current_number)

    return answers, number_at_line


def explanation_after(lines: list[str], question_number: int, answer_line: int) -> str:
    collected: list[str] = []
    started = False

    for line in lines[answer_line + 1 :]:
        if "【答案】" in line:
            break
        if not line.strip():
            continue

        numbered_explanation = re.match(r"^(?:【解析】\s*)?(\d+)\s*[.．、]\s*(.*)$", line)
        if numbered_explanation:
            found_number = int(numbered_explanation.group(1))
            if found_number == question_number:
                started = True
                collected.append(numbered_explanation.group(2))
                continue
            if started or found_number > question_number:
                break
            continue

        content = re.sub(r"^【(?:详解|解析)】\s*", "", line).strip()
        if re.match(r"^\s*\d+\s*[.．、]", content) or re.match(r"^[一二三四五六七八九十]+[、.．]", content):
            break
        started = True
        collected.append(content)

    return " ".join(part for part in collected if part).strip()


def question_start(lines: list[str], question_number: int, before_line: int) -> tuple[int, str] | None:
    found: tuple[int, str] | None = None
    for index, line in enumerate(lines[:before_line]):
        numbered = NUMBERED_LINE.match(line)
        if not numbered or any(marker in line for marker in ("【答案】", "【详解】", "【解析】")):
            continue
        if int(numbered.group(1)) == question_number and numbered.group(2).strip().upper() not in "ABCDEF":
            found = (index, numbered.group(2).strip())
    return found


def option_texts_before_answer(lines: list[str], start_line: int, answer_line: int) -> list[str]:
    marker = re.compile(r"(?<![A-Za-z])([A-D])\s*[.．、]\s*")
    found: dict[str, str] = {}
    for line in lines[start_line + 1 : answer_line]:
        matches = list(marker.finditer(line))
        if not matches:
            continue
        prefix = line[: matches[0].start()].strip()
        labels = [match.group(1) for match in matches]
        if prefix and labels[0] in "BCD" and "A" not in labels and len(prefix) < 120:
            found.setdefault("A", prefix)
        for position, match in enumerate(matches):
            end = matches[position + 1].start() if position + 1 < len(matches) else len(line)
            text = line[match.end() : end].strip()
            if text:
                found.setdefault(match.group(1), text)
    return [found[label] for label in "ABCD" if label in found]


def prompt_before_options(lines: list[str], start_line: int, answer_line: int, first_line_text: str) -> str:
    option_marker = re.compile(r"(?<![A-Za-z])[A-D]\s*[.．、]\s*")
    parts = [first_line_text] if first_line_text else []
    for line in lines[start_line + 1 : answer_line]:
        if option_marker.search(line):
            break
        if line.strip() and not re.match(r"^[一二三四五六七八九十]+[、.．]", line.strip()):
            parts.append(line.strip())
    return " ".join(part for part in parts if part).strip()


def complete_question(question: dict) -> bool:
    options = question.get("options")
    answer_index = question.get("answerIndex")
    return bool(
        question.get("prompt", "").strip()
        and question.get("explanation", "").strip()
        and question.get("sourceRef", "").strip()
        and isinstance(options, list)
        and len(options) >= 2
        and isinstance(answer_index, int)
        and 0 <= answer_index < len(options)
        and (not UNRESOLVED_IMAGE.search(question.get("prompt", "")) or question.get("imageUrl"))
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--teacher-dir", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    source_sets = json.loads(args.input.read_text(encoding="utf-8"))
    document_cache: dict[str, tuple[list[str], dict[int, tuple[str, int]], list[int | None], list[str]]] = {}
    stats = Counter()
    unresolved: list[dict[str, str]] = []

    for practice_set in source_sets:
        for question in practice_set.get("questions", []):
            stats["questions"] += 1
            question["prompt"] = clean_marked_text(question.get("prompt", ""))
            question["options"] = [clean_marked_text(str(option)) for option in question.get("options", [])]
            question["options"] = [option for option in question["options"] if option]

            if complete_question(question):
                question["needsReview"] = False
                question["publishable"] = True
                stats["alreadyComplete"] += 1
                continue

            source_ref = question.get("sourceRef", "")
            docx_name = source_ref.split("#", 1)[0].split("/")[-1].replace(".md", ".docx")
            source_docx = args.teacher_dir / docx_name
            if not source_docx.exists():
                stats["missingTeacherDocx"] += 1
                question["needsReview"] = True
                question["publishable"] = False
                continue

            if docx_name not in document_cache:
                lines = [paragraph.text.strip() for paragraph in Document(source_docx).paragraphs]
                answers, number_at_line = scan_document(lines)
                document_cache[docx_name] = (lines, answers, number_at_line, [normalized(line) for line in lines])

            lines, answers, number_at_line, normalized_lines = document_cache[docx_name]
            prompt_key = normalized(question.get("prompt", ""))
            matching_numbers = {
                number_at_line[index]
                for index, line_key in enumerate(normalized_lines)
                if prompt_key and len(prompt_key) >= 3 and prompt_key in line_key
                and number_at_line[index] is not None
                and not any(marker in lines[index] for marker in ("【答案】", "【详解】", "【解析】"))
            }

            if len(matching_numbers) != 1:
                stats["ambiguousOrUnmatchedPrompt"] += 1
                question["needsReview"] = True
                question["publishable"] = False
                if len(unresolved) < 20:
                    unresolved.append({"id": question.get("id", ""), "source": docx_name, "why": "prompt did not identify one teacher-version question"})
                continue

            question_number = next(iter(matching_numbers))
            key = answers.get(question_number)
            if not key:
                stats["missingTeacherAnswer"] += 1
                question["needsReview"] = True
                question["publishable"] = False
                continue

            letter, answer_line = key
            answer_index = ord(letter) - ord("A")
            existing_index = question.get("answerIndex")
            if isinstance(existing_index, int) and existing_index != answer_index:
                stats["answerConflict"] += 1
                question["needsReview"] = True
                question["publishable"] = False
                question.pop("answerIndex", None)
                continue

            options = question.get("options", [])
            if answer_index >= len(options):
                start = question_start(lines, question_number, answer_line)
                recovered = option_texts_before_answer(lines, start[0], answer_line) if start else []
                if len(recovered) >= 2 and answer_index < len(recovered):
                    question["options"] = recovered
                    question["prompt"] = prompt_before_options(lines, start[0], answer_line, start[1]) or question["prompt"]
                    options = recovered
                    stats["optionsRecoveredFromTeacherDocx"] += 1

            if answer_index >= len(options) or len(options) < 2 or (UNRESOLVED_IMAGE.search(question.get("prompt", "")) and not question.get("imageUrl")):
                stats["incompleteQuestionStructure"] += 1
                question["needsReview"] = True
                question["publishable"] = False
                continue

            explanation = explanation_after(lines, question_number, answer_line)
            if explanation:
                question["explanation"] = explanation
            if not question.get("explanation", "").strip():
                stats["missingTeacherExplanation"] += 1
                question["needsReview"] = True
                question["publishable"] = False
                continue

            question["answerIndex"] = answer_index
            question["needsReview"] = False
            question["publishable"] = True
            stats["recoveredFromTeacherDocx"] += 1

    for practice_set in source_sets:
        if practice_set.get("questions"):
            stats["readyQuestions"] += sum(complete_question(question) for question in practice_set["questions"])
            stats["setsWithQuestions"] += 1

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(source_sets, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        **dict(stats),
        "teacherDocumentsRead": len(document_cache),
        "unresolvedSamples": unresolved,
        "output": str(args.output),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
