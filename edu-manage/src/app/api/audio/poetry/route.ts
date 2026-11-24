import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const text = searchParams.get('text')?.trim()

  if (!text) {
    return new NextResponse('Text parameter is required', { status: 400 })
  }

  try {
    const upstreamUrl = `https://fanyi.baidu.com/gettts?lan=zh&text=${encodeURIComponent(
      text
    )}&spd=4&source=web`
    const upstreamRes = await fetch(upstreamUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 86400 * 30 }, // 30 days cache
    })

    if (!upstreamRes.ok) {
      return new NextResponse('Upstream poetry recitation fetch failed', {
        status: upstreamRes.status,
      })
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
      `Poetry audio proxy error: ${error instanceof Error ? error.message : 'Unknown'}`,
      { status: 500 }
    )
  }
}
