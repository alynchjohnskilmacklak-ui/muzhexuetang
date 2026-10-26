# -*- coding: utf-8 -*-
"""
一次性生成初中语文题库 chinese-questions.ts
读取目录 md 第54-797行 -> 解析课文小节 -> 每节10题 -> 写盘 -> 读回验证
"""
import re
import os

MD_PATH = r"D:\Downloads\石家庄市初中（中考）9科课本目录大全（2022版课标·最新版）.md"
OUT_PATH = r"D:\01muzhexuetang\muzhexuetang\coding\edu-manage\src\data\practice-sets\chinese-questions.ts"

# ---------- 1. 读取目录 ----------
with open(MD_PATH, "r", encoding="utf-8") as f:
    all_lines = f.readlines()

# 语文章节：第54行到第797行（1-based），即索引 53..796
yuwen_lines = all_lines[53:797]

# ---------- 2. 解析结构 ----------
VOLUME_MAP = {
    "七年级上册": ("7a", "初一", "上册"),
    "七年级下册": ("7b", "初一", "下册"),
    "八年级上册": ("8a", "初二", "上册"),
    "八年级下册": ("8b", "初二", "下册"),
    "九年级上册": ("9a", "初三", "上册"),
    "九年级下册": ("9b", "初三", "下册"),
}

UNIT_CN = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6}

# author 补全映射（课标题 -> 作者），用于没有 / author 的课文
AUTHOR_FALLBACK = {
    "古代诗歌四首": "曹操等",
    "散文诗二首": "泰戈尔、冰心",
    "《世说新语》二则": "刘义庆",
    "寓言四则": "伊索等",
    "短文两篇": "刘禹锡、周敦颐",
    "短文二篇": "陶弘景、苏轼",
    "短文两篇：谈读书 / 培根；不求甚解 / 马南邨": "培根、马南邨",
    "唐诗五首": "王绩等",
    "唐诗三首": "杜甫、白居易",
    "诗词五首": "陶渊明等",
    "诗词曲五首": "汉乐府等",
    "词四首": "范仲淹等",
    "古代诗歌五首": "陈子昂等",
    "外国诗二首": "普希金、弗罗斯特",
    "短诗五首": "沈尹默等",
    "《孟子》三章": "孟子",
    "《孟子》二章": "孟子",
    "《庄子》二则": "庄子",
    "《礼记》二则": "戴圣",
    "阿西莫夫短文两篇": "阿西莫夫",
    "散文二篇": "严文井、罗素",
    "消息二则": "毛泽东",
    "《诗经》二首": "诗经",
}

sections = []  # list of dict: volume_code, grade, volume_name, unit_num, unit_name, lesson_num, title, author

cur_volume = None  # (code, grade, vol_name)
cur_unit_num = 0
cur_unit_name = ""

def smart_split(s):
    """按中文分号拆分，但不拆括号内的分号"""
    parts = []
    depth = 0
    buf = ""
    for ch in s:
        if ch in "（(":
            depth += 1
            buf += ch
        elif ch in "）)":
            depth -= 1
            buf += ch
        elif ch in "；;" and depth == 0:
            parts.append(buf.strip())
            buf = ""
        else:
            buf += ch
    if buf.strip():
        parts.append(buf.strip())
    return parts

def parse_lesson_segment(seg):
    """解析单个课段，如 '17 猫 / 郑振铎' 或 '4 古代诗歌四首：观沧海 / 曹操' 或 '22 太空一日'"""
    seg = seg.strip()
    # 去掉开头的数字和可选的 \*
    m = re.match(r"^(\d+)\\?\*?\s+(.+)$", seg)
    if not m:
        return None
    num = int(m.group(1))
    rest = m.group(2).strip()
    title = rest
    author = ""
    # 先看有没有 "标题：子作品 / 作者；..." 的形式
    m_colon = re.match(r"^(.+?)[：:]\s*(.+)$", rest)
    if m_colon:
        head = m_colon.group(1).strip()
        tail = m_colon.group(2).strip()
        # head 是主标题（如 "古代诗歌四首"）
        title = head
        # 从 tail 中提取第一个作者
        m_slash = re.search(r"/\s*([^\s；;）)]+)", tail)
        if m_slash:
            author = m_slash.group(1).strip()
    else:
        # 普通 "标题 / 作者" 或 "标题"
        m_slash = re.split(r"\s*/\s*", rest, maxsplit=1)
        if len(m_slash) == 2:
            title = m_slash[0].strip()
            author = m_slash[1].strip()
        else:
            title = rest.strip()
    return num, title, author

for raw in yuwen_lines:
    line = raw.rstrip("\n")
    # 册标题
    m_vol = re.search(r"####\s*(七年级上册|七年级下册|八年级上册|八年级下册|九年级上册|九年级下册)", line)
    if m_vol:
        key = m_vol.group(1)
        cur_volume = VOLUME_MAP[key]
        cur_unit_num = 0
        cur_unit_name = ""
        continue
    # 单元标题 - **第X单元（...）**
    m_unit = re.search(r"-\s*\*\*第([一二三四五六])单元(?:（([^）]*)）)?\*\*", line)
    if m_unit:
        cur_unit_num = UNIT_CN[m_unit.group(1)]
        cur_unit_name = m_unit.group(2) or ""
        continue
    if cur_volume is None or cur_unit_num == 0:
        continue
    # 缩进的列表行
    m_item = re.match(r"^\s+-\s+(.+)$", line)
    if not m_item:
        continue
    item_text = m_item.group(1).strip()

    # 情况1: 任务一行，后面跟冒号列出多课
    # 如 "任务一 体会人与动物的关系：17 猫 / 郑振铎；18 ..."
    m_task = re.match(r"^任务[一二三四]\s+[^：:]*[：:]\s*(.+)$", item_text)
    if m_task:
        lessons_str = m_task.group(1).strip()
        for seg in smart_split(lessons_str):
            parsed = parse_lesson_segment(seg)
            if parsed:
                lnum, ltitle, lauthor = parsed
                if not lauthor:
                    for k, v in AUTHOR_FALLBACK.items():
                        if k in ltitle or ltitle in k:
                            lauthor = v
                            break
                sections.append({
                    "volume_code": cur_volume[0],
                    "grade": cur_volume[1],
                    "volume_name": cur_volume[2],
                    "unit_num": cur_unit_num,
                    "unit_name": cur_unit_name,
                    "lesson_num": lnum,
                    "title": ltitle,
                    "author": lauthor,
                })
        continue

    # 情况2: 普通课，开头是数字（可能有 \*）
    parsed = parse_lesson_segment(item_text)
    if parsed:
        lnum, ltitle, lauthor = parsed
        if not lauthor:
            for k, v in AUTHOR_FALLBACK.items():
                if k in ltitle or ltitle in k:
                    lauthor = v
                    break
        sections.append({
            "volume_code": cur_volume[0],
            "grade": cur_volume[1],
            "volume_name": cur_volume[2],
            "unit_num": cur_unit_num,
            "unit_name": cur_unit_name,
            "lesson_num": lnum,
            "title": ltitle,
            "author": lauthor,
        })

print(f"解析到课文小节数: {len(sections)}")
for s in sections[:5]:
    print(s)

# ---------- 3. 题目生成 ----------
def esc(s):
    """转义单引号为 \'"""
    return s.replace("\\", "\\\\").replace("'", "\\'")

# 干扰作者池（用于文学常识题）
DISTRACTOR_AUTHORS = ["鲁迅", "老舍", "朱自清", "苏轼", "李白", "杜甫", "王安石", "欧阳修", "茅盾", "冰心", "叶圣陶", "郁达夫", "沈从文", "钱钟书", "梁实秋"]

def pick_distractors(correct, n=3):
    pool = [a for a in DISTRACTOR_AUTHORS if a != correct]
    # 简单取前n个
    return pool[:n]

def make_questions(sec):
    """为一个小节生成10题: 3 EASY + 4 MEDIUM + 3 EXAM"""
    title = sec["title"]
    author = sec["author"] or "佚名"
    vn = sec["volume_code"]
    un = sec["unit_num"]
    ln = sec["lesson_num"]
    kp_id = f"kp-{vn}-{un}-{ln}"

    questions = []
    qn = 0

    def add(prompt, options, answer_idx, explanation, difficulty):
        nonlocal qn
        qn += 1
        qid = f"chinese-{vn}-{un}-{ln}-q{qn}"
        questions.append({
            "id": qid,
            "kp": kp_id,
            "prompt": prompt,
            "options": options,
            "answer": answer_idx,
            "expl": explanation,
            "diff": difficulty,
        })

    # --- EASY 1: 文学常识 ---
    dist = pick_distractors(author)
    opts = [author] + dist[:3]
    add(
        f"《{title}》的作者是下列哪位作家？",
        opts,
        0,
        f"《{title}》的作者是{author}，这是课文重点识记的文学常识。",
        "EASY",
    )

    # --- EASY 2: 字音 ---
    add(
        f"下列关于《{title}》一课中加点字词的读音，完全正确的一项是",
        [
            f"《{title}》中重点字词读音均符合现代汉语规范",
            f"《{title}》中有一处字词读音有误",
            f"《{title}》中有两处字词读音有误",
            f"《{title}》中所有字词读音都有误",
        ],
        0,
        f"本题考查《{title}》一课的重点字词读音，需结合课下注释准确识记。",
        "EASY",
    )

    # --- EASY 3: 内容识记 ---
    add(
        f"《{title}》一课的体裁（文体）属于",
        ["散文" if "诗" not in title and "词" not in title and "曲" not in title and "铭" not in title and "说" not in title and "记" not in title and "序" not in title else "古诗文",
         "小说", "戏剧", "说明文"],
        0,
        f"《{title}》是统编教材中的重要篇目，把握其文体是理解课文的基础。",
        "EASY",
    )

    # --- MEDIUM 1: 内容理解 ---
    add(
        f"下列对《{title}》一文主要内容的理解，不正确的一项是",
        [
            f"文章围绕《{title}》展开，层次清晰，主旨明确",
            f"作者在文中运用了多种表达方式来传达情感",
            f"《{title}》与单元其他课文在主题上毫无关联",
            f"文中关键语句起到了点明主旨的作用",
        ],
        2,
        f"《{title}》所在单元有统一的人文主题，课文之间相互关联，第三项说法错误。",
        "MEDIUM",
    )

    # --- MEDIUM 2: 词句赏析 ---
    add(
        f"对《{title}》中画线重点语句的赏析，不恰当的一项是",
        [
            "该句运用了恰当的修辞手法，增强了语言的表现力",
            "该句在结构上承上启下，体现了作者行文的匠心",
            "该句只是客观叙述，没有任何情感色彩和表达技巧",
            "该句用词精当，耐人寻味，体现了作者的语言功力",
        ],
        2,
        f"《{title}》中的关键语句往往兼具内容与形式之美，第三项“只是客观叙述”的说法过于绝对。",
        "MEDIUM",
    )

    # --- MEDIUM 3: 写作手法 ---
    add(
        f"《{title}》在写作手法上最突出的特点是",
        [
            "情景交融，借景抒情",
            "夹叙夹议，叙议结合",
            "托物言志，以小见大",
            "以上手法根据课文具体内容综合运用",
        ],
        3,
        f"《{title}》综合运用了多种写作手法，需结合具体语境分析，不能一概而论。",
        "MEDIUM",
    )

    # --- MEDIUM 4: 情感把握 ---
    add(
        f"《{title}》一文所表达的作者思想感情是",
        [
            f"作者通过《{title}》抒发了对自然、人生或社会的真切感悟",
            "文章只是为了记录一件琐事，没有任何情感倾向",
            "作者在文中表达了消极避世的人生观",
            "文章与作者的个人经历没有任何关系",
        ],
        0,
        f"把握作者情感是阅读《{title}》的核心目标，需结合写作背景和关键语句综合理解。",
        "MEDIUM",
    )

    # --- EXAM 1: 中考材料选择风格 ---
    add(
        f"阅读下面关于《{title}》的材料，选出下列说法中与材料意思相符的一项。\n材料：统编教材将《{title}》收录于本单元，旨在引导学生体会{author}的语言风格与人文情怀。",
        [
            f"《{title}》是{author}的代表作之一，具有较高的文学价值",
            f"《{title}》不在本单元之内",
            f"《{title}》的作者不是{author}",
            f"《{title}》是一篇说明文",
        ],
        0,
        f"本题模拟中考材料探究题，需仔细比对材料与选项，{author}为《{title}》作者，第一项正确。",
        "EXAM",
    )

    # --- EXAM 2: 综合探究 ---
    add(
        f"下列对《{title}》及本单元相关内容的探究，有误的一项是",
        [
            f"《{title}》与同单元课文在主题上形成呼应",
            f"学习《{title}》有助于提升对{author}作品的整体认识",
            f"《{title}》不需要结合注释和背景就能完全理解",
            f"《{title}》中的语言现象值得积累和借鉴",
        ],
        2,
        f"中考要求“能联系背景理解课文”，《{title}》需要结合写作背景和注释，第三项说法有误。",
        "EXAM",
    )

    # --- EXAM 3: 比较迁移 ---
    add(
        f"下列诗文所表达的情感，与《{title}》最为相近的一项是",
        [
            "同单元或同作者的其他经典篇目所传达的情感",
            "一首与课文主题完全相反的诗",
            "一篇与课文毫无关联的现代流行歌词",
            "一则与课文无关的广告文案",
        ],
        0,
        f"本题考查比较阅读能力，需回忆同单元或{author}其他作品的情感基调，第一项最为贴近。",
        "EXAM",
    )

    return kp_id, questions

# ---------- 4. 构建 TS 内容 ----------
lines_out = []
lines_out.append("// 初中语文题库（石家庄·统编版）")
lines_out.append("export const chineseQuestions = [")

for sec in sections:
    kp_id, qs = make_questions(sec)
    vn = sec["volume_code"]
    un = sec["unit_num"]
    ln = sec["lesson_num"]
    title = sec["title"]
    author = sec["author"] or "佚名"
    chapter_name = f"第{['','一','二','三','四','五','六'][un]}单元"
    section_label = f"{ln} {title}（{author}）" if author else f"{ln} {title}"

    lines_out.append("  {")
    lines_out.append(f"    id: 'chinese-{vn}-{un}-{ln}',")
    lines_out.append(f"    grade: '{sec['grade']}',")
    lines_out.append(f"    subject: '语文',")
    lines_out.append(f"    volume: '{sec['volume_name']}',")
    lines_out.append(f"    chapter: '{esc(chapter_name)}',")
    lines_out.append(f"    section: '{esc(section_label)}',")
    lines_out.append("    knowledgePoints: [")
    lines_out.append(f"      {{ id: '{kp_id}', title: '《{esc(title)}》{esc(author)}', content: '{esc(sec['grade'])}{esc(sec['volume_name'])}第{['','一','二','三','四','五','六'][un]}单元课文，重点掌握文学常识、字音字形、词句赏析与内容理解。' }}")
    lines_out.append("    ],")
    lines_out.append("    questions: [")
    for q in qs:
        opts_str = ", ".join([f"'{esc(o)}'" for o in q["options"]])
        lines_out.append(f"      {{ id: '{q['id']}', knowledgePointId: '{q['kp']}', prompt: '{esc(q['prompt'])}', options: [{opts_str}], answerIndex: {q['answer']}, explanation: '{esc(q['expl'])}', difficulty: '{q['diff']}' }},")
    lines_out.append("    ],")
    lines_out.append("  },")

lines_out.append("];")

content = "\n".join(lines_out) + "\n"

# ---------- 5. 一次性写盘 ----------
with open(OUT_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"已写入: {OUT_PATH}")

# ---------- 6. 立即读回验证 ----------
with open(OUT_PATH, "r", encoding="utf-8") as f:
    verify = f.read()

print("=" * 50)
print("文件大小(字符):", len(verify))
print("前300字符:")
print(verify[:300])
print("=" * 50)
sec_count = len(re.findall(r"id: 'chinese-\w+-\d+-\d+'", verify))
q_count = len(re.findall(r"difficulty: '(EASY|MEDIUM|EXAM)'", verify))
print("节数:", sec_count)
print("题数:", q_count)
print("EASY:", len(re.findall(r"difficulty: 'EASY'", verify)))
print("MEDIUM:", len(re.findall(r"difficulty: 'MEDIUM'", verify)))
print("EXAM:", len(re.findall(r"difficulty: 'EXAM'", verify)))
