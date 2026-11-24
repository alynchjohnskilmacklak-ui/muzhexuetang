import type { PersonalizedLearningSummary } from './personalized-summary'

const CACHE_TTL_MS = 10 * 60_000
const MAX_CACHE_ENTRIES = 500

const cache = new Map<string, { summary: PersonalizedLearningSummary; expiresAt: number }>()
const inFlight = new Map<string, Promise<PersonalizedLearningSummary | null>>()

export async function getCachedPersonalizedLearningSummary(
  key: string,
  create: () => Promise<PersonalizedLearningSummary | null>,
  now = Date.now(),
): Promise<PersonalizedLearningSummary | null> {
  const cached = cache.get(key)
  if (cached && cached.expiresAt > now) return cached.summary
  if (cached) cache.delete(key)

  const pending = inFlight.get(key)
  if (pending) return pending

  const generating = Promise.resolve().then(create)
  inFlight.set(key, generating)
  try {
    const summary = await generating
    if (summary) {
      for (const [cacheKey, entry] of cache) {
        if (entry.expiresAt <= now) cache.delete(cacheKey)
      }
      while (cache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = cache.keys().next().value as string | undefined
        if (!oldestKey) break
        cache.delete(oldestKey)
      }
      cache.set(key, { summary, expiresAt: now + CACHE_TTL_MS })
    }
    return summary
  } finally {
    if (inFlight.get(key) === generating) inFlight.delete(key)
  }
}

export function clearPersonalizedLearningSummaryCache() {
  cache.clear()
  inFlight.clear()
}
