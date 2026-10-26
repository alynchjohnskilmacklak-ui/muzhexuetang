export function isSerializationConflict(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2034')
}

export async function runSerializableWithRetry<T>(run: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return await run()
    } catch (error) {
      if (!isSerializationConflict(error) || attempt === retries - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, 80 * (attempt + 1)))
    }
  }
  throw new Error('课程安排事务重试失败')
}
