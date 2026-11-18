import type { PracticeSet } from './parent-practice-bank'

// 学科到文件的映射（英文文件名，避免中文编码问题）
const subjectImporters: Record<string, () => Promise<PracticeSet[]>> = {
  '数学': () => import('./practice-sets/math-questions').then(m => m.数学Questions),
  '语文': () => import('./practice-sets/chinese-questions').then(m => m.语文Questions),
  '英语': () => import('./practice-sets/english-questions').then(m => m.英语Questions),
  '物理': () => import('./practice-sets/physics-questions').then(m => m.物理Questions),
  '化学': () => import('./practice-sets/chemistry-questions').then(m => m.化学Questions),
  '历史': () => import('./practice-sets/history-questions').then(m => m.历史Questions),
  '地理': () => import('./practice-sets/geography-questions').then(m => m.地理Questions),
  '生物': () => import('./practice-sets/biology-questions').then(m => m.生物Questions),
  '政治': () => import('./practice-sets/politics-questions').then(m => m.政治Questions),
}

// 缓存已加载的学科数据
const cache: Record<string, PracticeSet[]> = {}

/**
 * 动态加载指定学科的题库数据
 */
export async function loadPracticeSetsBySubject(subject: string): Promise<PracticeSet[]> {
  if (cache[subject]) {
    return cache[subject]
  }
  
  const importer = subjectImporters[subject]
  if (!importer) {
    return []
  }
  
  const sets = await importer()
  cache[subject] = sets
  return sets
}

/**
 * 动态加载多个学科的题库数据
 */
export async function loadPracticeSetsBySubjects(subjects: string[]): Promise<PracticeSet[]> {
  const results = await Promise.all(
    subjects.map(subject => loadPracticeSetsBySubject(subject))
  )
  return results.flat()
}
