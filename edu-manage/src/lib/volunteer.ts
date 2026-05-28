import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import path from 'path'
import { existsSync, readFileSync } from 'fs'
import * as XLSX from 'xlsx'
import { BATCH_TAGS } from '@/lib/volunteer-shared'

const VOLUNTEER_DOCS = [
  {
    name: '石家庄市2022年高中阶段学校招生录取工作实施方案解读',
    type: 'POLICY_DOC' as const,
    fileUrl: '/volunteer/docs/2022-plan-explanation.txt',
    sortOrder: 1,
  },
  {
    name: '2025年石家庄市其他县（市、区）省级示范性普通高中分配生计划',
    type: 'QUOTA_TABLE' as const,
    fileUrl: '/volunteer/docs/2025-allocation-quota.xlsx',
    sortOrder: 2,
  },
]

export const DEFAULT_VOLUNTEER_STEPS = [
  {
    order: 1,
    title: '打开石家庄教育考试院官网',
    content: '在浏览器搜索【石家庄教育考试院】，或直接访问：http://www.sjzjyksxx.com.cn/，进入官方网站。',
    tipContent: '建议使用电脑端 Chrome 或 Edge 浏览器访问，手机端可能兼容性不佳。',
    imageUrl: '/volunteer/picture/step-1.png',
    batchTags: [],
  },
  {
    order: 2,
    title: '进入中考栏目，找到志愿填报入口',
    content: '进入官网后，在顶部导航选择【中考】栏目，然后点击【志愿填报流程】进入下一步。',
    tipContent: '志愿填报系统只在规定时间段内开放，请提前确认开放日期，避免错过截止时间。',
    imageUrl: '/volunteer/picture/step-2.png',
    batchTags: [],
  },
  {
    order: 3,
    title: '登录考生账号',
    content: '在登录界面输入考生的【身份证号码】和之前设置的【密码】，点击登录进入系统。忘记密码可联系就读学校教务处重置。',
    tipContent: '密码连续错误多次可能导致账号临时锁定，请仔细核对后再输入。',
    imageUrl: '/volunteer/picture/step-3.png',
    batchTags: [],
  },
  {
    order: 4,
    title: '选择“中考志愿填报”',
    content: '登录成功后，在功能列表中找到并点击【中考志愿填报】，进入填报页面。',
    imageUrl: '/volunteer/picture/step-4.png',
    batchTags: [],
  },
  {
    order: 5,
    title: '填写志愿填报承诺书',
    content: '进入填报系统后，首先需要阅读并填写《石家庄市高中阶段学校招生志愿填报承诺书》，这是必须完成的步骤，按照页面提示如实填写即可。',
    tipContent: '承诺书是必填项，不填写无法进入后续填报流程。',
    imageUrl: '/volunteer/picture/step-5.png',
    batchTags: [],
  },
  {
    order: 6,
    title: '选择批次类别',
    content: '系统提供多个批次选择：提前批（3+4本科）、普通高中及高中阶段艺体类、3+2、五年一贯制、普通中职类。大多数文化生选择【普通高中及高中阶段艺体类】。',
    tipContent: '如对职业类学校有意向，可根据实际情况选择其他批次。',
    imageUrl: '/volunteer/picture/step-6.png',
    batchTags: BATCH_TAGS,
  },
  {
    order: 7,
    title: '第一批：省级示范性普通高中填报',
    content: '第一批省级示范高中包含 A/B 段艺体类、C 段分配生和 D 段平行志愿。C 段省级示范高中分配生只能填报 1 个学校，D 段可填报 6 个省级示范高中平行志愿。已在 C 段填报某校，无需再在 D 段重复填报。',
    tipContent: '分配生计划优先投档；C 段未录取后，按 D 段第 1-6 志愿依次录取。',
    imageUrl: '/volunteer/picture/step-7.png',
    batchTags: ['普通高中（主选）'],
  },
  {
    order: 8,
    title: '第二批：非省级示范高中填报',
    content: '第二批包含非省级示范高中艺体类、普通中等职业学校艺术类、非省级示范普通高中文化类。文化生重点填报 C 段，可填 6 个平行志愿。',
    tipContent: '第二批 C 段是多数学生的重要保底选择，建议结合往年录取分数线，从高到低合理排列。',
    imageUrl: '/volunteer/picture/step-8.png',
    batchTags: ['普通高中（主选）'],
  },
  {
    order: 9,
    title: '保存志愿，填报完成',
    content: '填完所有志愿后，点击【保存志愿】按钮。系统会要求再次输入登录密码确认安全，输入正确后志愿信息保存成功。保存后可通过【查看志愿】确认填报结果。',
    tipContent: '截止时间前可以修改；截止后无法更改，请提前核对所有志愿。',
    imageUrl: '/volunteer/picture/step-9.png',
    batchTags: [],
  },
]

export async function getOrCreateVolunteerGuide() {
  const guide = await prisma.volunteerGuide.findFirst({
    orderBy: { createdAt: 'desc' },
  })
  if (guide) {
    await ensureVolunteerDocuments(guide.id)
    await ensureVolunteerQuotaData(guide.id, guide.year)
    await ensureVolunteerStepImages(guide.id)
    return guide
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.volunteerGuide.create({
      data: {
        title: '石家庄中考志愿填报指南',
        subtitle: '普通高中及高中阶段艺体类 · 2025年版',
        year: 2025,
        isPublished: true,
      },
    })
    await tx.guideStep.createMany({
      data: DEFAULT_VOLUNTEER_STEPS.map((step) => ({
        guideId: created.id,
        ...step,
        isPublished: true,
      })),
    })
    await tx.guideDocument.createMany({ data: VOLUNTEER_DOCS.map((doc) => ({ ...doc, guideId: created.id })) })
    return created
  })
}

export function parseVolunteerQuotaWorkbook(filePath = path.join(process.cwd(), 'public', 'volunteer', 'docs', '2025-allocation-quota.xlsx')) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
  if (!existsSync(absolutePath)) {
    throw new Error(`Quota workbook not found: ${absolutePath}`)
  }
  const workbook = XLSX.read(readFileSync(absolutePath), { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
  if (!rows.length) return []

  const firstKey = Object.keys(rows[0])[0]
  const normalized: Array<{ schoolName: string; district: string; allocQuota: number; normalQuota: number; totalQuota: number; note: string; year: number }> = []
  for (const row of rows) {
    const sourceSchool = String(row[firstKey] || '').trim()
    if (!sourceSchool) continue
    for (const [rawSchoolName, rawValue] of Object.entries(row)) {
      if (rawSchoolName === firstKey) continue
      const quota = Number(rawValue || 0)
      if (!Number.isFinite(quota)) continue
      const schoolName = rawSchoolName.replace(/\s+/g, '')
      normalized.push({
        schoolName,
        district: firstKey.replace(/\s+/g, ''),
        allocQuota: quota,
        normalQuota: 0,
        totalQuota: quota,
        note: sourceSchool,
        year: 2025,
      })
    }
  }
  return normalized
}

const STEP_IMAGE_MAP = new Map(DEFAULT_VOLUNTEER_STEPS.map(s => [s.order, s.imageUrl]))

function patchMissingImageUrls(steps: { order: number; imageUrl?: string | null }[]) {
  for (const step of steps) {
    if (!step.imageUrl && STEP_IMAGE_MAP.has(step.order)) {
      step.imageUrl = STEP_IMAGE_MAP.get(step.order)!
    }
  }
}

async function ensureVolunteerStepImages(guideId: string) {
  const steps = await prisma.guideStep.findMany({ where: { guideId }, orderBy: { order: 'asc' } })
  let updated = false
  for (const step of steps) {
    const defaultUrl = STEP_IMAGE_MAP.get(step.order)
    if (!step.imageUrl && defaultUrl) {
      console.log(`[volunteer] backfilling imageUrl for step order=${step.order}: ${defaultUrl}`)
      await prisma.guideStep.update({ where: { id: step.id }, data: { imageUrl: defaultUrl } })
      updated = true
    }
  }
  if (updated) {
    revalidatePath('/volunteer')
    revalidatePath('/parent/volunteer')
  }
}

async function ensureVolunteerDocuments(guideId: string) {
  const existing = await prisma.guideDocument.count({ where: { guideId } })
  if (existing >= VOLUNTEER_DOCS.length) return
  for (const doc of VOLUNTEER_DOCS) {
    const found = await prisma.guideDocument.findFirst({ where: { guideId, fileUrl: doc.fileUrl } })
    if (!found) await prisma.guideDocument.create({ data: { ...doc, guideId } })
  }
}

async function ensureVolunteerQuotaData(guideId: string, year: number) {
  const existing = await prisma.quotaRecord.count({ where: { guideId, year } })
  if (existing > 0) return
  try {
    const data = parseVolunteerQuotaWorkbook().map((row) => ({ ...row, guideId, year }))
    if (data.length) await prisma.quotaRecord.createMany({ data })
  } catch (error) {
    console.warn('[volunteer] quota bootstrap skipped', error)
  }
}

export async function getVolunteerGuideForAdmin() {
  const guide = await getOrCreateVolunteerGuide()
  const result = await prisma.volunteerGuide.findUnique({
    where: { id: guide.id },
    include: {
      steps: { orderBy: { order: 'asc' } },
      documents: { orderBy: { sortOrder: 'asc' } },
      quotaData: { orderBy: { schoolName: 'asc' }, take: 500 },
    },
  })
  if (result?.steps) patchMissingImageUrls(result.steps)
  return result
}

export async function getVolunteerGuideForParent() {
  const guide = await getOrCreateVolunteerGuide()
  const result = await prisma.volunteerGuide.findFirst({
    where: { id: guide.id, isPublished: true },
    include: {
      steps: { where: { isPublished: true }, orderBy: { order: 'asc' } },
      documents: { orderBy: { sortOrder: 'asc' } },
      quotaData: { orderBy: { schoolName: 'asc' }, take: 1000 },
    },
  })
  if (result?.steps) patchMissingImageUrls(result.steps)
  return result
}
