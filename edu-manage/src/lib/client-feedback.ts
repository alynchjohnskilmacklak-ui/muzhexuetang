import { toast } from 'sonner'

/**
 * Extract a human-readable error message from various error shapes.
 */
export function getErrorMessage(
  error: unknown,
  fallback = '操作失败，请稍后重试',
): string {
  if (!error) return fallback

  if (typeof error === 'string') return error

  if (error instanceof Error) {
    // Preserve backend payload messages if they're the Error message
    return error.message || fallback
  }

  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>
    if (typeof e.error === 'string' && e.error) return e.error
    if (typeof e.message === 'string' && e.message) return e.message
    if (typeof e.details === 'string' && e.details) return e.details
  }

  return fallback
}

/**
 * Typed wrapper around fetch with unified loading/success/error toast feedback.
 *
 * @example
 * const data = await requestJson<User>('/api/students', { method: 'POST', body })
 */
export async function requestJson<T = unknown>(
  url: string,
  options?: RequestInit,
  config?: {
    /** Toast message shown while the request is in-flight. */
    loading?: string
    /** Toast message shown on success. */
    success?: string
    /** Prefix prepended to the error message. */
    errorPrefix?: string
    /** Whether to show a success toast. Default true when `success` is set. */
    showSuccess?: boolean
  },
): Promise<T> {
  const { loading, success, errorPrefix, showSuccess = true } = config ?? {}
  let toastId: string | number | undefined

  try {
    if (loading) {
      toastId = toast.loading(loading)
    }

    const res = await fetch(url, options)

    // parse JSON (may fail if server returns non-JSON)
    let payload: unknown
    try {
      payload = await res.json()
    } catch {
      payload = {}
    }

    if (!res.ok) {
      const body = payload as Record<string, unknown> | undefined
      const errorMsg =
        (typeof body?.error === 'string' && body.error) ||
        (typeof body?.message === 'string' && body.message) ||
        `请求失败 (${res.status})`
      throw new Error(errorPrefix ? `${errorPrefix}：${errorMsg}` : errorMsg)
    }

    if (toastId !== undefined) {
      toast.dismiss(toastId)
      toastId = undefined
    }

    if (showSuccess && success) {
      toast.success(success)
    }

    return payload as T
  } catch (error: unknown) {
    if (toastId !== undefined) {
      toast.dismiss(toastId)
      toastId = undefined
    }
    const msg = getErrorMessage(error)
    toast.error(errorPrefix ? `${errorPrefix}：${msg}` : msg)
    throw error
  }
}

/**
 * Show a success toast (sonner). Use this when manual control is needed.
 */
export function feedbackSuccess(message: string): void {
  toast.success(message)
}

/**
 * Show an error toast with the best available message.
 * Prefer requestJson where possible; use this for manual error handling.
 */
export function feedbackError(error: unknown, fallback?: string): void {
  toast.error(getErrorMessage(error, fallback))
}

/**
 * Show a warning toast.
 */
export function feedbackWarning(message: string): void {
  toast.warning(message)
}

/**
 * Convenience for "loading" control when not using requestJson.
 * Returns a dismiss function.
 */
export function feedbackLoading(message: string): () => void {
  const id = toast.loading(message)
  return () => toast.dismiss(id)
}
