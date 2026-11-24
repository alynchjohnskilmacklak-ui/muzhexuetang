export default function ParentFeedbackDetailLoading() {
  return (
    <div style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: '16px 14px 32px' }} aria-label="正在加载课堂反馈详情">
      <div className="mz-skeleton" style={{ height: 24, width: 160, borderRadius: 8, marginBottom: 12 }} />
      <div className="mz-skeleton" style={{ height: 76, width: '100%', borderRadius: 16, marginBottom: 14 }} />
      <div className="mz-skeleton" style={{ height: 150, width: '100%', borderRadius: 16, marginBottom: 14 }} />
      <div className="mz-skeleton" style={{ height: 90, width: '100%', borderRadius: 16 }} />
    </div>
  )
}
