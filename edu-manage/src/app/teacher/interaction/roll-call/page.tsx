'use client'

import { useEffect, useMemo, useState } from 'react'
import { Modal, message } from 'antd'
import { type RollCallStatus } from '@/lib/classroom-interaction'
import { getTeacherAttendanceSubmissionState } from '@/lib/teacher-intensive-scheduling'
import { canWriteTeacherAttendance } from '@/lib/teacher-lesson-navigation'
import { type RollCallSubmissionRecord, useInteractionLoad } from '../_components/shell'
import styles from '../interaction.module.css'

/** 点名三态循环：到课 → 迟到 → 缺勤 → 到课 */
const CYCLE: RollCallStatus[] = ['PRESENT', 'LATE', 'ABSENT']

type Row = {
  rollCall: RollCallStatus | null
  attendance: string | null
}

export default function RollCallPage() {
  const { data, now, saveRollCall, resetRollCall, reload, saving } = useInteractionLoad()
  // 点选只改本地草稿，提交时才写考勤
  const [draft, setDraft] = useState<Record<string, RollCallStatus>>({})
  const [mealStudentIds, setMealStudentIds] = useState<Set<string>>(new Set())

  const rows = useMemo(() => {
    const map = new Map<string, Row>()
    for (const record of data?.records ?? []) {
      map.set(record.studentId, {
        rollCall: (record.rollCallStatus as RollCallStatus | null) ?? null,
        attendance: record.status,
      })
    }
    return map
  }, [data?.records])

  useEffect(() => {
    setMealStudentIds(new Set(data?.mealStudentIds ?? []))
  }, [data?.lesson.id, data?.mealStudentIds])

  if (!data) return null

  const attendanceSubmissionState = getTeacherAttendanceSubmissionState({
    lessonDate: data.lesson.lessonDate,
    startTime: data.lesson.startTime,
    endTime: data.lesson.endTime,
    intensiveMode: data.lesson.intensiveMode,
    now,
  })
  const canSubmitAttendance = canWriteTeacherAttendance(data.lesson, now)
  const attendanceSubmitted = data.attendanceSubmitted
  const rollCallSubmitted = data.rollCallSubmitted
  const locked = Boolean(attendanceSubmitted || rollCallSubmitted)
  // 请假是家长已提交的考勤事实：不参与点名、不可改、也不算"未点"
  const leaveIds = new Set(
    data.records
      .filter((record) => record.status === 'LEAVE' && !record.rollCallStatus)
      .map((record) => record.studentId),
  )

  const stateOf = (studentId: string): Row => {
    const local = draft[studentId]
    const base = rows.get(studentId)
    if (local) {
      return {
        rollCall: local,
        attendance: local === 'ABSENT' ? 'ABSENT' : local === 'LATE' ? 'PRESENT' : 'PRESENT',
      }
    }
    return base ?? { rollCall: null, attendance: null }
  }

  const isAbsentCell = (studentId: string) => {
    const state = stateOf(studentId)
    return state.rollCall === 'ABSENT' || state.attendance === 'ABSENT'
  }

  const needMark = data.students.filter((student) => {
    if (leaveIds.has(student.studentId)) return false
    const state = stateOf(student.studentId)
    return !state.rollCall && !state.attendance
  }).length
  const markedCount = data.students.filter((student) => !leaveIds.has(student.studentId)).length - needMark
  const leaveCount = data.students.filter((student) => leaveIds.has(student.studentId)).length

  const tap = async (studentId: string) => {
    if (!canSubmitAttendance) {
      message.info(attendanceSubmissionState === 'CLOSED'
        ? '教师考勤需在课程当天 18:00 前提交'
        : '常规课程开课前 30 分钟开放考勤，突击班开课后开放')
      return
    }
    if (attendanceSubmitted) {
      message.warning('本节课考勤已提交，点名已锁定')
      return
    }
    // 提交后只留一个口子：缺勤的学员后到了，补记为迟到
    if (rollCallSubmitted) {
      if (!isAbsentCell(studentId)) {
        message.warning('本节课点名已提交，只有缺勤的学员能补记迟到')
        return
      }
      try {
        const response = await fetch('/api/teacher/interaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId: data.lesson.id, action: 'late', studentId }),
        })
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        if (!response.ok) {
          message.error(payload.error || '补记失败')
          return
        }
        message.success('已补记为迟到')
        await reload()
      } catch {
        message.error('网络异常，补记失败')
      }
      return
    }
    if (leaveIds.has(studentId)) return
    const state = stateOf(studentId)
    const currentIndex = state.rollCall ? CYCLE.indexOf(state.rollCall) : -1
    const next = currentIndex >= 0 ? CYCLE[(currentIndex + 1) % CYCLE.length]! : 'PRESENT'
    setDraft((prev) => ({ ...prev, [studentId]: next }))
  }

  const markRestPresent = () => {
    if (!canSubmitAttendance) {
      message.info(attendanceSubmissionState === 'CLOSED'
        ? '教师考勤需在课程当天 18:00 前提交'
        : '常规课程开课前 30 分钟开放考勤，突击班开课后开放')
      return
    }
    if (locked) return
    const next = { ...draft }
    for (const student of data.students) {
      if (leaveIds.has(student.studentId)) continue
      const state = stateOf(student.studentId)
      if (!state.rollCall && !state.attendance) next[student.studentId] = 'PRESENT'
    }
    setDraft(next)
  }

  const submit = () => {
    if (!canSubmitAttendance) {
      message.info(attendanceSubmissionState === 'CLOSED'
        ? '教师考勤需在课程当天 18:00 前提交，超时请联系管理员补录'
        : '常规课程开课前 30 分钟开放考勤，突击班开课后开放')
      return
    }
    if (locked || saving) return
    if (needMark > 0) {
      message.warning(`还有 ${needMark} 人未点，不能提交`)
      return
    }
    const records: RollCallSubmissionRecord[] = data.students.map((student) => {
      const state = stateOf(student.studentId)
      if (leaveIds.has(student.studentId)) {
        return { studentId: student.studentId, status: 'LEAVE', rollCallStatus: null }
      }
      const status: RollCallSubmissionRecord['status'] = (state.rollCall
        ? state.rollCall === 'ABSENT'
        : state.attendance === 'ABSENT')
        ? 'ABSENT'
        : state.attendance === 'MAKEUP' && !state.rollCall
          ? 'MAKEUP'
          : 'PRESENT'
      const rollCallStatus = state.rollCall
        || (status === 'ABSENT' ? 'ABSENT' : status === 'PRESENT' ? 'PRESENT' : null)
      return { studentId: student.studentId, status, rollCallStatus }
    })
    if (records.length === 0) {
      message.warning('没有可提交的点名记录')
      return
    }
    const present = records.filter((record) => record.status === 'PRESENT' || record.status === 'MAKEUP').length
    const absent = records.filter((record) => record.status === 'ABSENT').length
    const leave = records.filter((record) => record.status === 'LEAVE').length
    Modal.confirm({
      title: '确认提交并同步完成本节考勤？',
      content: `将写入到课 ${present} 人、缺勤 ${absent} 人${leave ? `、请假 ${leave} 人` : ''}。提交后自动同步完成考勤录入与课时扣减，无需前往考勤页面重复操作；本节课工资只结算一次。${data.lesson.intensiveMode === 'INTENSIVE' ? '突击班仍需管理员审核后结算。' : ''}`,
      okText: '确认提交',
      cancelText: '再检查一下',
      onOk: async () => {
        const ok = await saveRollCall(records, [...mealStudentIds])
        if (ok) {
          setDraft({})
        }
      },
    })
  }

  const reset = () => {
    Modal.confirm({
      title: '撤销提交？',
      content: '撤销后需要重新点名并再次提交。已经写入的出勤记录不会删除，重新提交会覆盖。',
      okText: '撤销提交',
      cancelText: '取消',
      onOk: async () => {
        const ok = await resetRollCall()
        if (ok) setDraft({})
      },
    })
  }

  return (
    <>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2 className={styles.panelTitle}>点名</h2>
            <p className={styles.panelHint}>
              {locked
                ? '本节课考勤已提交'
                : '点一下记录到课、迟到或缺勤；确认后会同时提交正式考勤和课时处理'}
            </p>
          </div>
          <button
            type="button"
            className={styles.smallBtn}
            onClick={markRestPresent}
            disabled={locked || saving || !canSubmitAttendance}
          >
            未点的全部到课
          </button>
        </div>

        <div className={styles.rollSummary}>
          <span>已点 {markedCount}/{data.students.length - leaveCount}</span>
          {leaveCount > 0 ? <span>请假 {leaveCount}（家长已提交，不可改）</span> : null}
          {saving ? <span className={styles.savingDot}>保存中…</span> : null}
        </div>

        {data.isSystemFirstPeriod ? (
          <p className={styles.mealNote} role="status">
            首节课请勾选实际就餐学员；未勾选将按未就餐记录。
          </p>
        ) : null}

        <div className={styles.rosterGrid}>
          {data.students.map((student) => {
            const state = stateOf(student.studentId)
            const late = state.rollCall === 'LATE'
            const absent = isAbsentCell(student.studentId)
            const leave = leaveIds.has(student.studentId)
            const present = !leave
              && !late
              && !absent
              && (state.rollCall === 'PRESENT' || state.attendance === 'PRESENT' || state.attendance === 'MAKEUP')
            const unmarked = !leave && !late && !absent && !state.rollCall && !state.attendance
            const label = leave
              ? '请假'
              : late
                ? '迟到'
                : absent
                  ? '缺勤'
                  : state.rollCall || state.attendance
                    ? '到课'
                    : '未点'
            const disabled = attendanceSubmitted
              || leave
              || (rollCallSubmitted && !absent)
            return (
              <div key={student.studentId} className={styles.rosterItem}>
                <button
                  type="button"
                  className={`${styles.rosterCell} ${leave ? styles.cellLeave : absent ? styles.cellAbsent : late ? styles.cellLate : present ? styles.cellPresent : unmarked ? styles.cellUnmarked : ''}`}
                  onClick={() => void tap(student.studentId)}
                  disabled={disabled || !canSubmitAttendance}
                >
                  <span className={styles.cellName}>{student.name}</span>
                  <span className={styles.cellBadge}>{label}</span>
                </button>
                {data.isSystemFirstPeriod && !leave ? (
                  <label className={styles.mealToggle}>
                    <input
                      type="checkbox"
                      checked={mealStudentIds.has(student.studentId)}
                      disabled={!canSubmitAttendance || attendanceSubmitted || saving}
                      onChange={(event) => {
                        setMealStudentIds((current) => {
                          const next = new Set(current)
                          if (event.target.checked) next.add(student.studentId)
                          else next.delete(student.studentId)
                          return next
                        })
                      }}
                    />
                    <span>就餐</span>
                  </label>
                ) : null}
              </div>
            )
          })}
        </div>

        <p className={styles.legend}>
          {locked
            ? '考勤已提交并同步到考勤页；如需更正，请联系管理员调整。'
            : '请假学员不可点，也不计入应点人数；「未点的全部到课」只补没点的人，不会覆盖已点的状态。'}
        </p>
      </section>

      {rollCallSubmitted && !attendanceSubmitted ? (
        <section className={styles.submitBar}>
          <p className={styles.submitHint}>
            旧点名记录已于
            {' '}
            {data.rollCallSubmittedAt
              ? new Date(data.rollCallSubmittedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
              : '刚刚'}
            {' '}
            保存，但正式考勤尚未完成。撤销旧点名后重新提交，可一次完成考勤和课时处理。
          </p>
          <button type="button" className={styles.dangerLink} onClick={reset} disabled={saving || !canSubmitAttendance}>
            撤销旧点名记录
          </button>
        </section>
      ) : null}

      {attendanceSubmitted ? (
        <p className={styles.lockNote}>
          ✅ 本节课考勤已正式提交并完成录入！出勤记录与课时流水已自动同步，无需前往考勤页重复操作。如需更正出勤或课时，请联系管理员处理。
        </p>
      ) : null}

      {!locked ? (
        <section className={styles.submitBar}>
          <p className={styles.submitHint}>
            {needMark > 0
              ? `还有 ${needMark} 人未点，不能提交`
              : !canSubmitAttendance && attendanceSubmissionState === 'CLOSED'
                ? '教师考勤已超过当天 18:00 截止时间，请联系管理员补录'
                : !canSubmitAttendance
                  ? '常规课程开课前 30 分钟开放考勤，突击班开课后开放'
                  : '全部已点，点击提交直接完成本节考勤录入'}
          </p>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={submit}
            disabled={saving || needMark > 0 || !canSubmitAttendance}
            title={!canSubmitAttendance ? '考勤提交开放至课程当天 18:00' : undefined}
          >
            {saving ? '提交中…' : !canSubmitAttendance ? '考勤暂不可提交' : '提交点名并同步考勤'}
          </button>
        </section>
      ) : null}
    </>
  )
}
