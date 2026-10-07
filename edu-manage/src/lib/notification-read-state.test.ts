import { describe, expect, it } from 'vitest'
import { notificationReadData, unreadNotificationWhere } from './notification-read-state'

describe('notification read state', () => {
  it('uses one canonical unread predicate', () => {
    expect(unreadNotificationWhere).toEqual({ read: false })
  })

  it('updates the flag and timestamp together', () => {
    const readAt = new Date('2026-09-12T00:00:00.000Z')
    expect(notificationReadData(readAt)).toEqual({ read: true, readAt })
  })
})
