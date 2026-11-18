'use client'

export class SalarySubmissionError extends Error {
  constructor(message: string, readonly outcomeUncertain: boolean) { super(message) }
}

export async function submitSalarySettlement(body: {
  teacherId: string; period: string; termId?: string; expectedTotal: number
}, timeoutMs = 30000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch('/api/admin/salary/settle', {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new SalarySubmissionError(payload?.error || `结算请求失败（HTTP ${response.status}），请刷新核对`, false)
    if (payload?.success !== true || typeof payload.total !== 'number' || !Number.isFinite(payload.total) || !Number.isInteger(payload.count) || payload.count < 0) {
      throw new SalarySubmissionError('服务器未返回有效结算结果。请刷新余额和流水核对，不要立即重复确认。', true)
    }
    return payload as { success: true; total: number; count: number; batchId?: string }
  } catch (error) {
    if (error instanceof SalarySubmissionError) throw error
    throw new SalarySubmissionError(controller.signal.aborted
      ? '等待结算结果超过30秒。服务器可能仍在处理，请刷新余额和流水核对，不要立即重复确认。'
      : '网络连接中断，结算结果尚未确认。请刷新余额和流水核对，不要立即重复确认。', true)
  } finally { clearTimeout(timer) }
}
