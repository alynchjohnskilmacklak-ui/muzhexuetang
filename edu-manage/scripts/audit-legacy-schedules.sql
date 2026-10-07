SELECT json_build_object(
  'total', (SELECT count(*) FROM "Schedule"),
  'active', (SELECT count(*) FROM "Schedule" WHERE status <> 'cancelled' AND "deletedAt" IS NULL),
  'deleted', (SELECT count(*) FROM "Schedule" WHERE "deletedAt" IS NOT NULL),
  'studentLinks', (SELECT count(*) FROM "ScheduleStudent"),
  'attendanceLinks', (SELECT count(*) FROM "Attendance" WHERE "scheduleId" IS NOT NULL),
  'leaveLinks', (SELECT count(*) FROM "LeaveRequest" WHERE "scheduleId" IS NOT NULL),
  'hourTransactionLinks', (SELECT count(*) FROM "HourTransaction" WHERE "scheduleId" IS NOT NULL),
  'statuses', COALESCE((
    SELECT json_object_agg(status, count)
    FROM (SELECT status, count(*) AS count FROM "Schedule" GROUP BY status ORDER BY status) grouped
  ), '{}'::json),
  'firstStart', (SELECT min("startTime") FROM "Schedule"),
  'lastEnd', (SELECT max("endTime") FROM "Schedule")
);
