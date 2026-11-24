export const VOLUNTEER_REFERENCE_TEXT =
  '牧哲学堂仅提供志愿填报参考，模拟结果不作为录取承诺。招生政策、计划、分数线及录取结果请以教育考试院、招生学校官方公布和实际录取情况为准；正式志愿请在官方平台核对并提交。'

export function VolunteerReferenceNotice() {
  return (
    <p style={{ margin: '0 0 16px', fontSize: 12, lineHeight: 1.8, color: 'var(--color-ink-subtle)', overflowWrap: 'anywhere' }}>
      {VOLUNTEER_REFERENCE_TEXT}
    </p>
  )
}
