export type DynamicRecord = Record<string, unknown> & { id: string }

export type DynamicModel = {
  count(args: unknown): Promise<number>
  findMany(args: unknown): Promise<DynamicRecord[]>
  findUnique(args: unknown): Promise<DynamicRecord | null>
  create(args: unknown): Promise<DynamicRecord>
  update(args: unknown): Promise<DynamicRecord>
  delete(args: unknown): Promise<DynamicRecord>
  updateMany(args: unknown): Promise<{ count: number }>
}

export function getDynamicModel(client: object, model: string): DynamicModel | undefined {
  return (client as unknown as Record<string, DynamicModel | undefined>)[model]
}
