export class ValidationError extends Error {
  status = 400
  constructor(msg: string) { super(msg); this.name = 'ValidationError' }
}
