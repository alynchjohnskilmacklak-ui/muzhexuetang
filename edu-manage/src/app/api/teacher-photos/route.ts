import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/get-user'
import { readdir } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const peopleDir = path.join(process.cwd(), 'public', 'people')
  try {
    const files = await readdir(peopleDir)
    const photos = files
      .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
      .map((name) => ({ name, url: `/people/${name}` }))
      .sort((a, b) => a.name.localeCompare(b.name))
    return NextResponse.json({ photos }, {
      headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600' },
    })
  } catch {
    return NextResponse.json({ photos: [] })
  }
}
