export const teacherApi = {
  list: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString()
    return fetch(`/api/teachers?${qs}`).then(r => r.json())
  },
  get: (id: string) => fetch(`/api/teachers/${id}`).then(r => r.json()),
  create: (data: Record<string, unknown>) =>
    fetch('/api/teachers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  update: (id: string, data: Record<string, unknown>) =>
    fetch(`/api/teachers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  remove: (id: string) => fetch(`/api/teachers/${id}`, { method: 'DELETE' }).then(r => r.json()),
  stats: () => fetch('/api/teachers/stats').then(r => r.json()),
}
