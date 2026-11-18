import { assertProductionSecurityEnv } from '@/lib/env-security'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    assertProductionSecurityEnv()
  }
}

