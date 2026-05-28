export function normalizeAIAnswer(text: string) {
  return text
    .replace(/!\[[^\]]*\]\((?!https?:|data:)[^)]+\)/g, '')
    .replace(/\\Omega/g, 'Ω')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
