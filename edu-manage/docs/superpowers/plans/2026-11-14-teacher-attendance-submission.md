# Teacher attendance submission flow

## Goal

- Make the teacher classroom roll-call submit the official attendance submission.
- Allow teacher attendance submission through 18:00 China local time on the lesson date, while retaining the existing opening-time rules.
- Keep administrator backfill and attendance correction available after the teacher cutoff.
- Preserve the once-per-lesson salary ledger guard and all existing hour, meal, and intensive-review processing.

## Implementation steps

1. Update the shared teacher attendance window and the teacher attendance page's cutoff wording/status.
2. Extend roll-call submission to send the complete roster and roll-call facts through the official attendance endpoint, including first-period meal selections and the intensive review path.
3. Preserve roll-call status and submission timestamp atomically with the attendance submission.
4. Keep the existing lesson-level salary idempotency key; review role/time gates on admin submit and adjustment routes without weakening their financial corrections.
5. Run type and lint checks on the touched files; do not run test suites.
