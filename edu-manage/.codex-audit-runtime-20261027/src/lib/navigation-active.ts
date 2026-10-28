/** Match route-bound views without confusing other query parameters with tabs. */
export function isNavigationActive(pathname: string, search: string, key: string) {
  const [path, query] = key.split('?')
  if (pathname !== path && !pathname.startsWith(`${path}/`)) return false
  if (!query) return true
  const actual = new URLSearchParams(search)
  return [...new URLSearchParams(query)].every(([name, value]) => actual.get(name) === value)
}
