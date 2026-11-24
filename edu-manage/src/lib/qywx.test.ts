import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getQywxExternalDetail, getQywxGroupSendResult, listQywxExternalIdsByMember, listQywxFollowUsers, sendQywxParentMass } from './qywx'

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('QYWX parent group-send adapter', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.stubEnv('QYWX_ENABLED', 'true')
    vi.stubEnv('QYWX_CORP_ID', `corp-${Math.random()}`)
    vi.stubEnv('QYWX_AGENT_ID', '100001')
    vi.stubEnv('QYWX_AGENT_SECRET', `agent-${Math.random()}`)
    vi.stubEnv('QYWX_CONTACT_SECRET', `contact-${Math.random()}`)
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('creates an individual link task with feedback text and a website URL', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ errcode: 0, access_token: 'contact-token', expires_in: 7200 }))
      .mockResolvedValueOnce(jsonResponse({ errcode: 0, msgid: 'msg-1', fail_list: [] }))

    const result = await sendQywxParentMass('teacher-1', ['external-parent-1'], {
      title: '小明的课堂反馈',
      desc: '课堂参与积极。',
      url: 'https://staging.example/parent/class-feedback/feedback-1?childId=student-1',
    })

    expect(result).toMatchObject({ success: true, channel: 'parent', msgid: 'msg-1' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const requestUrl = new URL(String(fetchMock.mock.calls[1][0]))
    expect(requestUrl.pathname).toBe('/cgi-bin/externalcontact/add_msg_template')
    expect(requestUrl.searchParams.getAll('access_token')).toEqual(['contact-token'])
    const payload = JSON.parse(String(fetchMock.mock.calls[1][1].body))
    expect(payload).toMatchObject({
      chat_type: 'single',
      external_userid: ['external-parent-1'],
      sender: 'teacher-1',
      attachments: [{
        msgtype: 'link',
        link: {
          title: '小明的课堂反馈',
          desc: '课堂参与积极。',
          url: 'https://staging.example/parent/class-feedback/feedback-1?childId=student-1',
        },
      }],
    })
  })

  it('uses the current POST result endpoint with the original sender id', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ errcode: 0, access_token: 'contact-token', expires_in: 7200 }))
      .mockResolvedValueOnce(jsonResponse({
        errcode: 0,
        send_list: [{ external_userid: 'external-parent-1', status: 1 }],
        next_cursor: '',
      }))

    const result = await getQywxGroupSendResult('msg-1', 'teacher-1')

    expect(result).toEqual({ sendList: [{ external_userid: 'external-parent-1', status: 1 }], complete: true })
    const requestUrl = new URL(String(fetchMock.mock.calls[1][0]))
    expect(requestUrl.pathname).toBe('/cgi-bin/externalcontact/get_groupmsg_send_result')
    expect(fetchMock.mock.calls[1][1].method).toBe('POST')
    expect(JSON.parse(String(fetchMock.mock.calls[1][1].body))).toMatchObject({ msgid: 'msg-1', userid: 'teacher-1', limit: 1000 })
  })

  it('does not report a task as successful when WeCom rejects the target contact', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ errcode: 0, access_token: 'contact-token', expires_in: 7200 }))
      .mockResolvedValueOnce(jsonResponse({ errcode: 0, msgid: 'msg-2', fail_list: ['external-parent-1'] }))

    const result = await sendQywxParentMass('teacher-1', ['external-parent-1'], {
      title: '课堂反馈',
      url: 'https://staging.example/parent/dashboard',
    })

    expect(result).toMatchObject({ success: false, failedExternalUserIds: ['external-parent-1'] })
  })

  it('returns customer-contact members from the WeCom API', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ errcode: 0, access_token: 'contact-token', expires_in: 7200 }))
      .mockResolvedValueOnce(jsonResponse({ errcode: 0, follow_user: ['teacher-1', 'teacher-2'] }))

    await expect(listQywxFollowUsers()).resolves.toEqual(['teacher-1', 'teacher-2'])
  })

  it('surfaces WeCom allowlist and permission errors instead of returning an empty member list', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ errcode: 0, access_token: 'contact-token', expires_in: 7200 }))
      .mockResolvedValueOnce(jsonResponse({ errcode: 60020, errmsg: 'not allowlisted' }))

    await expect(listQywxFollowUsers()).rejects.toThrow(/60020.*not allowlisted/)
  })

  it('surfaces errors when listing contacts for a specific WeCom member', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ errcode: 0, access_token: 'contact-token', expires_in: 7200 }))
      .mockResolvedValueOnce(jsonResponse({ errcode: 60020, errmsg: 'not allowlisted' }))

    await expect(listQywxExternalIdsByMember('teacher-1')).rejects.toThrow(/60020.*not allowlisted/)
  })

  it('reads the external contact name and type from the nested WeCom response', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ errcode: 0, access_token: 'contact-token', expires_in: 7200 }))
      .mockResolvedValueOnce(jsonResponse({
        errcode: 0,
        external_contact: {
          external_userid: 'external-parent-1',
          name: '赵@微信',
          type: 1,
          unionid: 'union-parent-1',
        },
        follow_user: [{ userid: 'RenWenTao' }],
      }))

    await expect(getQywxExternalDetail('external-parent-1')).resolves.toEqual({
      name: '赵@微信',
      type: 1,
      unionid: 'union-parent-1',
    })
  })

  it('does not hide errors when external contact details cannot be verified', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ errcode: 0, access_token: 'contact-token', expires_in: 7200 }))
      .mockResolvedValueOnce(jsonResponse({ errcode: 60020, errmsg: 'not allowlisted' }))

    await expect(getQywxExternalDetail('external-parent-1')).rejects.toThrow(/60020.*not allowlisted/)
  })
})
