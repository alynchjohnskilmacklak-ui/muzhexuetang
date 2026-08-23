from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(r"D:\01muzhexuetang\muzhexuetang\coding\edu-manage")
OUT = ROOT / "public" / "marketing" / "main-business"
OUT.mkdir(parents=True, exist_ok=True)

GEN = Path(r"C:\Users\Administrator\.codex\generated_images\01a01f84-8af2-70b3-bf2f-421a4ff0e5c6")
LOGO = Path(r"D:\01muzhexuetang\muzhexuetang\宣传文件\牧哲学堂new logo.jpg")
FEEDBACK = ROOT / "tmp" / "pdfs" / "marketing" / "feedback"
ONE = ROOT / "tmp" / "pdfs" / "marketing" / "one-to-one"

BASES = {
    "holiday": GEN / "exec-19d88430-f9fb-4f61-8be7-031141707d08.png",
    "one": GEN / "exec-bab9c563-d502-4f27-a32f-d5ebec489388.png",
    "evening": GEN / "exec-b69b8df7-6849-4da5-a0ce-03e2459f3e30.png",
    "weekend": GEN / "exec-f3b81af3-18bb-4b42-bd5f-5550603140dc.png",
}

FONT_REG = r"C:\Windows\Fonts\msyh.ttc"
FONT_BOLD = r"C:\Windows\Fonts\msyhbd.ttc"
INK = "#1a1201"
MUTED = "#5a4e3a"
ORANGE = "#E8784A"
GREEN = "#477b69"
CREAM = "#faf8f5"


def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)


def wrap(draw, text, fnt, max_width):
    lines = []
    for paragraph in text.split("\n"):
        current = ""
        for ch in paragraph:
            candidate = current + ch
            if draw.textbbox((0, 0), candidate, font=fnt)[2] <= max_width:
                current = candidate
            else:
                if current:
                    lines.append(current)
                current = ch
        lines.append(current)
    return lines


def text_block(draw, xy, text, size, width, fill=INK, bold=False, spacing=8, max_lines=None):
    fnt = font(size, bold)
    lines = wrap(draw, text, fnt, width)
    if max_lines:
        lines = lines[:max_lines]
    x, y = xy
    line_h = size + spacing
    for line in lines:
        draw.text((x, y), line, font=fnt, fill=fill)
        y += line_h
    return y


def paste_logo(im, box):
    logo = Image.open(LOGO).convert("RGB")
    logo = logo.crop((70, 65, 2100, 610))
    logo.thumbnail((box[2], box[3]), Image.Resampling.LANCZOS)
    x = box[0] + (box[2] - logo.width) // 2
    y = box[1] + (box[3] - logo.height) // 2
    im.paste(logo, (x, y))


def header(im, title, subtitle, title_x=350, title_y=82):
    d = ImageDraw.Draw(im)
    paste_logo(im, (55, 67, 270, 72))
    d.text((title_x, title_y), title, font=font(44, True), fill=INK)
    d.text((title_x, title_y + 58), subtitle, font=font(20), fill=MUTED)
    d.rounded_rectangle((title_x, title_y + 92, title_x + 145, title_y + 101), 5, fill=ORANGE)


def save_poster(key, filename, drawer):
    im = Image.open(BASES[key]).convert("RGB")
    drawer(im)
    im.save(OUT / filename, quality=95)


def holiday(im):
    d = ImageDraw.Draw(im)
    header(im, "寒暑假冲刺预备课", "初中、高中｜集中突破，假期不虚度", 350, 80)
    d.text((690, 458), "暑假 26 天", font=font(28, True), fill=ORANGE)
    d.text((833, 458), "寒假 16 天", font=font(28, True), fill=GREEN)
    cards = [
        ((55, 765), "01  教学精准", "教材紧贴河北中考大纲\n常考、必考、易错知识点集中突破\n把有限假期用在真正重要的地方"),
        ((540, 765), "02  师资可靠", "211/985 高校硕士研究生\n持教师资格证上岗\n教师资质公开可查，支持核验"),
        ((55, 1075), "03  小班陪学", "每班约 10 名学生\n至少 4 名老师参与教学与辅导\n管理员巡课，每位学生都被看见"),
        ((540, 1075), "04  家长实时可查", "课程、考勤、课堂反馈实时同步\n教师信息、剩余课时一目了然\nAI 智学与阶段报告持续跟进"),
    ]
    for (x, y), title, body in cards:
        d.text((x + 110, y), title, font=font(25, True), fill=ORANGE)
        text_block(d, (x + 28, y + 62), body, 20, 400, MUTED, spacing=10)
    d.text((150, 1458), "咨询：15930114500（同微信）｜18031264903", font=font(22, True), fill=INK)


def one_to_one(im):
    d = ImageDraw.Draw(im)
    header(im, "各年级一对一冲刺", "先诊断、后规划｜每一次进步都看得见", 350, 80)
    d.text((78, 682), "先诊断，后规划", font=font(28, True), fill=ORANGE)
    text_block(d, (78, 733), "结合学习基础、薄弱环节和目标学段\n制定个性化冲刺方案\n聚焦最需要提升的知识点", 19, 390, MUTED, spacing=9)
    d.text((550, 682), "每课反馈，家长可查", font=font(26, True), fill=GREEN)
    text_block(d, (550, 733), "课堂表现、知识掌握\n存在问题、后续建议\n课后当天同步", 18, 215, MUTED, spacing=8)
    steps = ["学情诊断", "目标规划", "针对授课", "反馈巩固", "阶段复盘"]
    for i, step in enumerate(steps):
        x = 78 + i * 172
        d.text((x, 1095), step, font=font(18, True), fill=INK)
    d.text((80, 1225), "一对一冲刺的五重保障", font=font(28, True), fill=ORANGE)
    text_block(d, (80, 1275), "• 每课后结构化反馈，薄弱点下一节重点回顾\n• 一键生成 PDF 学情报告，成绩趋势清晰可见\n• 知识点留痕、成长时间线与目标进度持续追踪", 18, 420, MUTED, spacing=8)
    text_block(d, (535, 1275), "• 211/985 硕士研究生，教师资格证可核验\n• 一对一 / 一对二 / 一对三灵活约课\n• 管理员审核课时、巡课查岗，保障教学质量", 18, 400, MUTED, spacing=8)
    d.text((150, 1452), "咨询：15930114500（同微信）｜18031264903", font=font(22, True), fill=INK)


def evening(im):
    d = ImageDraw.Draw(im)
    header(im, "晚间课业辅导营", "不是“看着写”，而是“带着学”", 350, 82)
    d.text((135, 760), "01  当天问题当天解决", font=font(23, True), fill=ORANGE)
    text_block(d, (70, 812), "作业前梳理课堂内容\n作业中现场答疑\n作业后逐项检查，确保写对、弄懂", 19, 390, MUTED, spacing=8)
    d.text((610, 760), "02  作业前后真实可查", font=font(23, True), fill=GREEN)
    text_block(d, (535, 812), "开始前与完成后分别拍照\n到勤、作业清单、完成状态\n老师说明同步到家长端", 19, 390, MUTED, spacing=8)
    d.rounded_rectangle((52, 1058, 370, 1340), 18, fill="#fffaf5", outline="#f1c3aa", width=2)
    d.text((70, 1080), "03  师资双重兜底", font=font(22, True), fill=ORANGE)
    text_block(d, (70, 1130), "1 位 211 硕士带队\n6 名师范类本科教师\n线下答不上，立即转线上\n教师群协同解答", 17, 270, MUTED, spacing=8)
    d.rounded_rectangle((585, 1100, 950, 1340), 18, fill="#fffaf5", outline="#f1c3aa", width=2)
    d.text((610, 1125), "04  答不上，本月免费", font=font(22, True), fill=ORANGE)
    text_block(d, (610, 1180), "本年级正常课业范围内\n线下 + 线上双重兜底\n仍无法解答，当月晚托费\n用全额免除", 17, 300, MUTED, spacing=8)
    d.text((145, 1460), "每晚学习真实、有效、看得见｜咨询 15930114500", font=font(22, True), fill=INK)


def weekend(im):
    d = ImageDraw.Draw(im)
    header(im, "周末先锋营", "一周一清，周周领先，越学越自信", 350, 82)
    labels = [(90, 390, "发现疑难"), (325, 390, "集中解决"), (565, 390, "提前预习"), (805, 390, "自信上课")]
    for x, y, t in labels:
        d.text((x, y), t, font=font(20, True), fill=INK)
    d.text((135, 710), "01  本周问题及时清", font=font(23, True), fill=GREEN)
    text_block(d, (68, 765), "疑难点专项讲解\n作业与测验错题集中订正\n一周一清，不让问题滚雪球", 19, 350, MUTED, spacing=9)
    d.text((610, 710), "02  下周知识提前预备", font=font(22, True), fill=ORANGE)
    text_block(d, (540, 765), "先一步熟悉新内容\n降低新课理解门槛\n新旧知识平滑衔接", 19, 370, MUTED, spacing=9)
    d.text((610, 960), "03  三重保障", font=font(23, True), fill=GREEN)
    text_block(d, (540, 1015), "查漏补缺｜夯实基础｜提前预习\n先补上周的洞，再铺下周的路", 19, 380, MUTED, spacing=9)
    d.text((135, 1190), "04  给孩子真正的学习自信", font=font(25, True), fill=ORANGE)
    text_block(d, (70, 1245), "会做 → 被表扬 → 更有信心 → 更愿意学 → 学得更好\n敢举手、敢提问、敢表达，课堂参与度自然提升", 20, 650, MUTED, spacing=10)
    d.text((145, 1452), "本周不欠账，下周有底气｜咨询 15930114500", font=font(22, True), fill=INK)


def evidence_poster(title, subtitle, pages, filename):
    W, H = 1200, 2400
    im = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((38, 36, 1162, 230), 36, fill="#fffaf5", outline="#f1c3aa", width=3)
    paste_logo(im, (65, 75, 330, 85))
    d.text((430, 68), title, font=font(44, True), fill=INK)
    d.text((430, 130), subtitle, font=font(22), fill=MUTED)
    d.rounded_rectangle((430, 177, 620, 187), 5, fill=ORANGE)
    cols = 2
    card_w, card_h = 520, 640
    x0, y0 = 60, 285
    gap_x, gap_y = 40, 45
    for idx, page_path in enumerate(pages):
        row, col = divmod(idx, cols)
        x = x0 + col * (card_w + gap_x)
        y = y0 + row * (card_h + gap_y)
        d.rounded_rectangle((x, y, x + card_w, y + card_h), 22, fill="white", outline="#eadfd6", width=2)
        page = Image.open(page_path).convert("RGB")
        fitted = ImageOps.contain(page, (card_w - 28, card_h - 55), Image.Resampling.LANCZOS)
        px = x + (card_w - fitted.width) // 2
        py = y + 18
        im.paste(fitted, (px, py))
        d.text((x + 18, y + card_h - 34), f"原始材料 {idx + 1}", font=font(15), fill="#9a8e7a")
    d.rounded_rectangle((80, 2290, 1120, 2360), 30, fill="#fff3ec")
    d.text((250, 2311), "真实材料原页展示｜未经 AI 重绘或改字", font=font(22, True), fill=ORANGE)
    im.save(OUT / filename, quality=95)


def main():
    save_poster("holiday", "01-holiday-intensive-infographic.png", holiday)
    save_poster("one", "02-one-to-one-infographic.png", one_to_one)
    save_poster("evening", "03-evening-homework-infographic.png", evening)
    save_poster("weekend", "04-weekend-pioneer-infographic.png", weekend)
    feedback_pages = [FEEDBACK / f"page-{i}.png" for i in range(1, 7)]
    one_pages = [ONE / f"page-{i:02d}.png" for i in (1, 2, 3, 4, 6)]
    evidence_poster("真实教师评语", "寒暑假冲刺预备课｜六页原始评语完整展示", feedback_pages, "05-real-teacher-feedback.png")
    evidence_poster("真实一对一课程规划", "九年级化学 7 天精讲计划｜原始页面如实展示", one_pages, "06-real-one-to-one-plan.png")
    print("\n".join(str(p) for p in sorted(OUT.glob("*.png"))))


if __name__ == "__main__":
    main()
