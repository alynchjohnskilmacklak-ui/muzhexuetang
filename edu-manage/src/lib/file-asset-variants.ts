import { Prisma } from '@prisma/client'

export type FeedbackImageVariant = {
  assetId: string | null
  originalUrl: string
  previewUrl: string
  thumbnailUrl: string
}

type RawQueryClient = {
  $queryRaw<T>(query: Prisma.Sql): Promise<T>
}

type AssetRow = {
  id: string
  url: string
  storageKey: string
  previewUrl?: string | null
  thumbnailUrl?: string | null
}

function defaultVariant(originalUrl: string): FeedbackImageVariant {
  return {
    assetId: null,
    originalUrl,
    previewUrl: originalUrl,
    thumbnailUrl: originalUrl,
  }
}

/**
 * ClassroomFeedback keeps original storage keys for backwards compatibility.
 * Resolve display variants in one query without changing the feedback model.
 */
export async function resolveFeedbackImageVariants(
  prisma: RawQueryClient,
  imageUrls: string[],
): Promise<Map<string, FeedbackImageVariant>> {
  const uniqueUrls = [...new Set(imageUrls.filter(Boolean))]
  const variants = new Map(uniqueUrls.map((url) => [url, defaultVariant(url)]))
  if (!uniqueUrls.length) return variants

  let assets: AssetRow[] = []
  try {
    assets = await prisma.$queryRaw<AssetRow[]>(Prisma.sql`
      SELECT "id", "url", "storageKey", "previewUrl", "thumbnailUrl"
      FROM "FileAsset"
      WHERE "deletedAt" IS NULL
        AND ("url" IN (${Prisma.join(uniqueUrls)}) OR "storageKey" IN (${Prisma.join(uniqueUrls)}))
    `)
  } catch {
    try {
      assets = await prisma.$queryRaw<AssetRow[]>(Prisma.sql`
        SELECT "id", "url", "storageKey", "thumbnailUrl"
        FROM "FileAsset"
        WHERE "deletedAt" IS NULL
          AND ("url" IN (${Prisma.join(uniqueUrls)}) OR "storageKey" IN (${Prisma.join(uniqueUrls)}))
      `)
    } catch {
      return variants
    }
  }

  for (const asset of assets) {
    const previewUrl = asset.previewUrl || asset.thumbnailUrl || asset.url
    const thumbnailUrl = asset.thumbnailUrl || asset.previewUrl || asset.url
    const variant: FeedbackImageVariant = {
      assetId: asset.id,
      originalUrl: asset.storageKey || asset.url,
      previewUrl,
      thumbnailUrl,
    }
    variants.set(asset.url, variant)
    variants.set(asset.storageKey, variant)
  }

  return variants
}

export function variantsForFeedback(
  imageUrls: string[],
  variants: Map<string, FeedbackImageVariant>,
): FeedbackImageVariant[] {
  return imageUrls.map((url) => variants.get(url) || defaultVariant(url))
}

/** Resolve one feedback's legacy imageUrls into the three display variants. */
export async function resolveFeedbackImages(
  prisma: RawQueryClient,
  imageUrls: string[],
): Promise<FeedbackImageVariant[]> {
  const variants = await resolveFeedbackImageVariants(prisma, imageUrls)
  return variantsForFeedback(imageUrls, variants)
}
