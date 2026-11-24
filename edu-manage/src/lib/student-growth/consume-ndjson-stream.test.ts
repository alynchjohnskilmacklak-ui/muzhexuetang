import { describe, expect, it, vi } from 'vitest'
import { consumeNdjsonStream } from './consume-ndjson-stream'

function responseFromChunks(chunks: string[], status = 200) {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return new Response(body, { status })
}

describe('consumeNdjsonStream', () => {
  it('parses UTF-8 events when JSON and multibyte characters cross chunk boundaries', async () => {
    const onEvent = vi.fn()
    const response = responseFromChunks([
      '{"type":"profile","name":"马',
      '子墨"}\n{"type":"summary","overview":"学习进步"}\n',
    ])

    await consumeNdjsonStream(response, onEvent)

    expect(onEvent).toHaveBeenNthCalledWith(1, { type: 'profile', name: '马子墨' })
    expect(onEvent).toHaveBeenNthCalledWith(2, { type: 'summary', overview: '学习进步' })
  })

  it('uses the API error message for non-success responses', async () => {
    const response = new Response(JSON.stringify({ error: '无权访问该学员' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })

    await expect(consumeNdjsonStream(response, vi.fn())).rejects.toThrow('无权访问该学员')
  })

  it('rejects malformed or empty streams', async () => {
    await expect(consumeNdjsonStream(responseFromChunks(['{bad}\n']), vi.fn()))
      .rejects.toThrow('报告内容读取异常')
    await expect(consumeNdjsonStream(responseFromChunks(['\n']), vi.fn()))
      .rejects.toThrow('报告内容为空')
  })
})
