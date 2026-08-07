import { describe, expect, it, vi } from 'vitest'
import {
  isUnambiguousTeacherAccountMatch,
  resolveTeacherForUser,
  resolveUserForTeacher,
} from './teacher-account-binding'

const teacher = {
  id: 'teacher-1',
  name: '陈晓茹',
  phone: '13800000000',
  email: null,
  status: 'ACTIVE',
  division: 'JUNIOR',
}

describe('teacher account binding compatibility', () => {
  it('matches a historical pinyin login account to its teacher record', () => {
    expect(isUnambiguousTeacherAccountMatch(
      { email: 'chenxiaoru@tea.com', name: '陈晓茹' },
      teacher,
    )).toBe(true)
  })

  it('resolves an unbound teacher account only when the match is unique', async () => {
    const db = {
      teacher: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([teacher]),
      },
      user: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    }

    const result = await resolveTeacherForUser(db as never, {
      id: 'user-1',
      email: 'chenxiaoru@tea.com',
      name: '陈晓茹',
      role: 'teacher',
      teacherId: null,
    })

    expect(result?.id).toBe('teacher-1')
  })

  it('resolves the notification recipient for a legacy unbound account', async () => {
    const legacyUser = {
      id: 'user-1',
      email: 'chenxiaoru@tea.com',
      name: '陈晓茹',
      role: 'teacher',
      status: 'active',
      teacherId: null,
    }
    const db = {
      teacher: {
        findUnique: vi.fn().mockResolvedValue(teacher),
        findMany: vi.fn(),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([legacyUser]),
      },
    }

    const result = await resolveUserForTeacher(db as never, 'teacher-1')

    expect(result?.id).toBe('user-1')
  })

  it('prefers the canonical email over a weaker same-name account match', async () => {
    const db = {
      teacher: {
        findUnique: vi.fn().mockResolvedValue(teacher),
        findMany: vi.fn(),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'user-1',
            email: 'chenxiaoru@tea.com',
            name: '陈晓茹',
            role: 'teacher',
            status: 'active',
            teacherId: null,
          },
          {
            id: 'user-2',
            email: 'other@tea.com',
            name: '陈晓茹',
            role: 'teacher',
            status: 'ACTIVE',
            teacherId: null,
          },
        ]),
      },
    }

    await expect(resolveUserForTeacher(db as never, 'teacher-1')).resolves.toMatchObject({
      id: 'user-1',
    })
  })

  it('refuses to guess between two teacher records with the same canonical identity', async () => {
    const db = {
      teacher: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([
          teacher,
          { ...teacher, id: 'teacher-2' },
        ]),
      },
      user: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    }

    await expect(resolveTeacherForUser(db as never, {
      id: 'user-1',
      email: 'chenxiaoru@tea.com',
      name: '陈晓茹',
      role: 'teacher',
      teacherId: null,
    })).resolves.toBeNull()
  })
})
