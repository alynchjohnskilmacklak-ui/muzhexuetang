import crypto from 'crypto'
import { validatePassword } from '@/lib/password-policy'

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%'
const ALL = `${LETTERS}${DIGITS}${SYMBOLS}`

function randomCharacter(alphabet: string) {
  return alphabet[crypto.randomInt(0, alphabet.length)]
}

function shuffle(value: string[]) {
  for (let index = value.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(0, index + 1)
    ;[value[index], value[swapIndex]] = [value[swapIndex], value[index]]
  }
  return value.join('')
}

/** Generate a readable, policy-compliant credential for one-time delivery. */
export function generateTemporaryPassword(length = 14) {
  const safeLength = Math.max(12, Math.min(length, 24))
  const characters = [
    randomCharacter(LETTERS),
    randomCharacter(DIGITS),
    randomCharacter(SYMBOLS),
  ]
  while (characters.length < safeLength) characters.push(randomCharacter(ALL))
  const password = shuffle(characters)
  if (!validatePassword(password).valid) return generateTemporaryPassword(safeLength)
  return password
}

