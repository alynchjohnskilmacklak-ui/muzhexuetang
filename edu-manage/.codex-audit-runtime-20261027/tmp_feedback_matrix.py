# -*- coding: utf-8 -*-
import io, os, re

def lines(p):
    return io.open(p, encoding='utf-8', errors='ignore').read().split('\n')

def scan(p, label, subs):
    print('=' * 30, label)
    if not os.path.exists(p):
        print('  MISSING', p)
        return
    ls = lines(p)
    t = '\n'.join(ls)
    for kw in subs:
        n = t.count(kw)
        if n:
            idxs = [m.start() for m in re.finditer(re.escape(kw), t)][:3]
            for idx in idxs:
                line_no = t[:idx].count('\n') + 1
                print('  L%-5d %-28s x%d  | %s' % (line_no, kw, n, ls[line_no - 1].strip()[:70]))

# 1 添加学员
scan('src/app/(main)/students/page.tsx', '添加学员', ['setSaving', 'toast.success', 'message.success', 'payload.error', '网络错误', 'submitting', 'setLoading', 'validateFields'])
scan('src/app/(main)/students/_components/StudentForm.tsx', '学生表单', ['validateFields', 'payload.error', 'toast.error', 'message.error', 'saving', '网络错误', 'submitting'])

# 2 绑定家长
scan('src/app/(main)/students/[id]/page.tsx', '绑定家长', ['link-parent', 'setLinkingParent', 'payload.error', 'message.success', 'validateFields', '网络错误'])

# 4 课堂反馈
scan('src/app/teacher/feedback/page.tsx', '课堂反馈', ['setSaving', 'toast.error', 'toast.success', 'payload.error', 'clientRequestId', '网络错误', 'setSaving(false)'])

# 5 临时补课/取消
scan('src/app/(main)/schedule/_components/ScheduleFormModal.tsx', '排课表单', ['setSaving', 'payload.error', 'message.success', '冲突', 'validateFields', '网络错误'])
scan('src/app/(main)/schedule/_components/ScheduleDetailPanel.tsx', '课次详情/取消', ['取消', 'setSaving', 'payload.error', 'message.success', '网络错误', 'confirm'])
scan('src/app/api/class-lessons/[id]/route.ts', '课次API', ['export async function', 'status: 4'])

# 6 上传
scan('src/app/(main)/materials/page.tsx', '资料上传', ['oss-signature', 'message.error', '上传失败', 'setUploading', 'payload.error', '网络错误'])
scan('src/app/teacher/materials/page.tsx', '教师资料上传', ['oss-signature', 'message.error', '上传失败', 'setUploading', 'payload.error', '网络错误'])

# 考勤已核（补重复提交锁）
scan('src/app/teacher/attendance/page.tsx', '考勤(重复锁)', ['submittingRef', 'setSubmitting', 'payload.error', 'toast.success'])
