import { EventEmitter } from 'events'

const globalForEmitter = globalThis as unknown as {
  sessionEmitter: EventEmitter | undefined
}

export const sessionEmitter =
  globalForEmitter.sessionEmitter ?? new EventEmitter()

if (!globalForEmitter.sessionEmitter) {
  globalForEmitter.sessionEmitter = sessionEmitter
  sessionEmitter.setMaxListeners(500)
}

export function emitKick(userId: string, sessionMark: string) {
  sessionEmitter.emit(`kick:${userId}`, sessionMark)
}
