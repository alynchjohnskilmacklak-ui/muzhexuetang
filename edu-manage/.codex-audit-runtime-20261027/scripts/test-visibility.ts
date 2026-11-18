import { parentActiveStudentWhere } from '../src/lib/business-visibility'

async function main() {
  const userId = 'test-user-id'
  const result = parentActiveStudentWhere(userId)
  console.log('--- parentActiveStudentWhere Result ---')
  console.log(JSON.stringify(result, null, 2))
}

main().catch(console.error)
