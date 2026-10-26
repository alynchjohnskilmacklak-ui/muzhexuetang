import { Prisma, PrismaClient } from '@prisma/client'
import { readStoredBuffer, uploadBuffer } from '../src/lib/storage'
import { generateImageVariants } from '../src/lib/image-variants'

const prisma = new PrismaClient()

function numberArg(name: string, fallback: number) {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1]
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

function stringArg(name: string) {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) || undefined
}

async function main() {
  const limit = Math.min(numberArg('limit', 100), 100)
  const after = stringArg('after')
  const dryRun = process.argv.includes('--dry-run')
  type AssetRow = {
    id: string
    originalName: string | null
    mimeType: string
    storageDriver: string
    storageKey: string
    thumbnailUrl: string | null
  }
  const afterClause = after ? Prisma.sql`AND "id" > ${after}` : Prisma.empty
  const assets = await prisma.$queryRaw<AssetRow[]>(Prisma.sql`
    SELECT "id", "originalName", "mimeType", "storageDriver", "storageKey", "thumbnailUrl"
    FROM "FileAsset"
    WHERE "ownerType" = 'feedback'
      AND "deletedAt" IS NULL
      AND "previewUrl" IS NULL
      AND "mimeType" LIKE 'image/%'
      ${afterClause}
    ORDER BY "id" ASC
    LIMIT ${limit}
  `)

  console.log(`[image-preview] selected=${assets.length} limit=${limit} dryRun=${dryRun}`)
  let succeeded = 0
  let failed = 0

  for (const asset of assets) {
    if (dryRun) {
      console.log(`[image-preview:dry-run] ${asset.id} ${asset.storageKey}`)
      continue
    }
    try {
      const original = await readStoredBuffer(asset.storageKey, asset.storageDriver)
      const basename = (asset.originalName || asset.storageKey).replace(/\.[^.]+$/, '')
      const generated = await generateImageVariants(original)
      const preview = await uploadBuffer(generated.previewBuffer, {
        originalName: `${basename}-preview.webp`,
        mimeType: 'image/webp',
        prefix: 'feedback-preview',
      })

      let thumbnailUrl = asset.thumbnailUrl
      if (!thumbnailUrl) {
        const thumbnail = await uploadBuffer(generated.thumbnailBuffer, {
          originalName: `${basename}-thumbnail.webp`,
          mimeType: 'image/webp',
          prefix: 'feedback-thumbnail',
        })
        thumbnailUrl = thumbnail.url
      }

      await prisma.$executeRaw(Prisma.sql`
        UPDATE "FileAsset"
        SET "previewUrl" = ${preview.url}, "thumbnailUrl" = ${thumbnailUrl}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${asset.id} AND "previewUrl" IS NULL
      `)
      succeeded += 1
      console.log(`[image-preview:ok] ${asset.id}`)
    } catch (error) {
      failed += 1
      console.error(`[image-preview:failed] ${asset.id}`, error instanceof Error ? error.message : error)
    }
  }

  const lastId = assets.at(-1)?.id || null
  console.log(JSON.stringify({ selected: assets.length, succeeded, failed, lastId, dryRun }))
  if (failed > 0) process.exitCode = 1
}

main()
  .catch((error) => {
    console.error('[image-preview:fatal]', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
