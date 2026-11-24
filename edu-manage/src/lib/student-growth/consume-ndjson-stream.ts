export async function consumeNdjsonStream<T>(
  response: Response,
  onEvent: (event: T) => void,
) {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: unknown }
    throw new Error(typeof payload.error === 'string' ? payload.error : '请求失败，请稍后重试')
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('报告连接已中断，请重试')

  const decoder = new TextDecoder()
  let pending = ''
  let eventCount = 0

  const consumeLine = (line: string) => {
    const value = line.trim()
    if (!value) return
    let event: T
    try {
      event = JSON.parse(value) as T
    } catch {
      throw new Error('报告内容读取异常，请重试')
    }
    eventCount += 1
    onEvent(event)
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      pending += decoder.decode(value, { stream: !done })
      let lineBreak = pending.indexOf('\n')
      while (lineBreak >= 0) {
        consumeLine(pending.slice(0, lineBreak))
        pending = pending.slice(lineBreak + 1)
        lineBreak = pending.indexOf('\n')
      }
      if (done) break
    }
    if (pending.trim()) consumeLine(pending)
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  } finally {
    reader.releaseLock()
  }

  if (eventCount === 0) throw new Error('报告内容为空，请重试')
}
