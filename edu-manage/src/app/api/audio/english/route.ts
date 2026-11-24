import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const word = searchParams.get('word')?.trim()
  const accent = searchParams.get('accent') === 'us' ? '2' : '1'

  if (!word) {
    return new NextResponse('Word parameter is required', { status: 400 })
  }

  try {
    const upstreamUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${accent}`
    const upstreamRes = await fetch(upstreamUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 86400 * 30 }, // 30 days cache
    })

    if (!upstreamRes.ok) {
      return new NextResponse('Upstream audio fetch failed', { status: upstreamRes.status })
    }

    const audioBuffer = await upstreamRes.arrayBuffer()
    const contentType = upstreamRes.headers.get('content-type') || 'audio/mpeg'

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=2592000, immutable',
        'Content-Length': String(audioBuffer.byteLength),
      },
    })
  } catch (error) {
    return new NextResponse(
      `Audio proxy error: ${error instanceof Error ? error.message : 'Unknown'}`,
      { status: 500 }
    )
  }
}
