export const DAILY_QUOTES: { text: string; source: string }[] = [
  { text: '学而不思则罔，思而不学则殆。', source: '《论语·为政》' },
  { text: '知之者不如好之者，好之者不如乐之者。', source: '《论语·雍也》' },
  { text: '温故而知新，可以为师矣。', source: '《论语·为政》' },
  { text: '敏而好学，不耻下问。', source: '《论语·公冶长》' },
  { text: '不积跬步，无以至千里；不积小流，无以成江海。', source: '荀子《劝学》' },
  { text: '锲而不舍，金石可镂。', source: '荀子《劝学》' },
  { text: '青，取之于蓝，而青于蓝。', source: '荀子《劝学》' },
  { text: '玉不琢，不成器；人不学，不知道。', source: '《礼记·学记》' },
  { text: '博学之，审问之，慎思之，明辨之，笃行之。', source: '《礼记·中庸》' },
  { text: '非淡泊无以明志，非宁静无以致远。', source: '诸葛亮《诫子书》' },
  { text: '业精于勤，荒于嬉；行成于思，毁于随。', source: '韩愈《进学解》' },
  { text: '纸上得来终觉浅，绝知此事要躬行。', source: '陆游《冬夜读书示子聿》' },
  { text: '问渠那得清如许？为有源头活水来。', source: '朱熹《观书有感》' },
  { text: '博观而约取，厚积而薄发。', source: '苏轼《稼说送张琥》' },
  { text: '千淘万漉虽辛苦，吹尽狂沙始到金。', source: '刘禹锡《浪淘沙》' },
  { text: '宝剑锋从磨砺出，梅花香自苦寒来。', source: '《警世贤文·勤奋篇》' },
  { text: '少壮不努力，老大徒伤悲。', source: '汉乐府《长歌行》' },
  { text: '会当凌绝顶，一览众山小。', source: '杜甫《望岳》' },
  { text: '长风破浪会有时，直挂云帆济沧海。', source: '李白《行路难》' },
  { text: '千里之行，始于足下。', source: '《老子》' },
  { text: '路漫漫其修远兮，吾将上下而求索。', source: '屈原《离骚》' },
  { text: '天行健，君子以自强不息。', source: '《周易·乾》' },
]

export function getDailyQuote(): { text: string; source: string; index: number } {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / 86400000)
  const index = dayOfYear % DAILY_QUOTES.length
  return { ...DAILY_QUOTES[index], index: index + 1 }
}
