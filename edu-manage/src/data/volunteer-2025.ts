// 2025年石家庄市17县区一分一档（score -> 累计排名人数）
// 总参考人数约 97644 人
export const SCORE_RANK_2025: Record<number, number> = {
  780:62,779:75,778:98,777:133,776:167,775:207,774:239,773:281,772:326,
  771:393,770:466,769:556,768:628,767:719,766:805,765:913,764:1021,
  763:1139,762:1281,761:1410,760:1570,759:1715,758:1874,757:2012,
  756:2169,755:2320,754:2504,753:2679,752:2879,751:3071,750:3273,
  749:3486,748:3693,747:3925,746:4165,745:4386,744:4597,743:4832,
  742:5103,741:5338,740:5565,739:5836,738:6076,737:6337,736:6590,
  735:6837,734:7100,733:7402,732:7684,731:7950,730:8248,729:8526,
  728:8797,727:9102,726:9397,725:9699,724:9993,723:10299,722:10592,
  721:10910,720:11210,719:11493,718:11792,717:12081,716:12375,715:12657,
  714:12959,713:13274,712:13561,711:13843,710:14154,709:14434,708:14761,
  707:15070,706:15368,705:15676,704:15986,703:16270,
  663:27776,662:28035,661:28305,660:28560,659:28804,658:29066,657:29305,
  656:29542,655:29793,654:30062,653:30297,652:30540,651:30806,650:31053,
  649:31303,648:31552,647:31790,646:32019,645:32266,644:32487,643:32716,
  642:32962,641:33196,640:33443,639:33685,638:33912,637:34135,636:34347,
  635:34561,634:34798,633:35005,632:35239,631:35489,630:35716,629:35941,
  628:36188,627:36437,626:36658,625:36895,
  585:45235,584:45426,583:45617,582:45784,581:45976,580:46167,579:46361,
  578:46575,577:46774,576:46993,575:47179,574:47378,573:47547,572:47699,
  571:47879,570:48062,569:48222,568:48398,567:48543,566:48722,565:48919,
  564:49090,563:49252,562:49432,561:49624,560:49785,559:49963,558:50150,
  557:50320,556:50501,555:50667,554:50856,553:51042,552:51229,551:51390,
  550:51545,549:51708,548:51908,547:52095,
  507:58655,506:58819,505:58973,504:59140,503:59297,502:59444,501:59606,
  500:59774,499:59928,498:60075,497:60231,496:60390,495:60555,494:60719,
  493:60855,492:61000,491:61148,490:61320,489:61478,488:61633,487:61817,
  486:61975,485:62139,484:62287,483:62429,482:62592,481:62765,480:62930,
  479:63090,478:63259,477:63424,476:63593,475:63753,474:63909,473:64077,
  472:64242,471:64406,470:64560,469:64727,
  429:70797,428:70953,427:71131,426:71274,425:71426,424:71555,423:71685,
  422:71845,421:71995,420:72152,419:72330,418:72473,417:72619,416:72744,
  415:72888,414:73031,413:73159,412:73293,411:73432,410:73574,409:73729,
  408:73877,407:74011,406:74131,405:74263,404:74400,403:74525,402:74654,
  401:74794,400:74949,399:75077,398:75217,397:75343,396:75483,395:75617,
  394:75746,393:75893,392:76032,391:76170,
  351:81273,350:81402,349:81529,348:81647,347:81765,346:81902,345:82029,
  344:82154,343:82265,342:82397,341:82506,340:82607,339:82705,338:82832,
  337:82945,336:83065,335:83179,334:83304,333:83416,332:83532,331:83651,
  330:83759,329:83880,328:83985,327:84083,326:84180,325:84276,324:84385,
  323:84482,322:84585,321:84694,320:84792,319:84916,318:85022,317:85144,
  316:85235,315:85352,314:85463,313:85546,
}

export const TOTAL_EXAMINEES_2025 = 97644

export interface HighSchool {
  id: string
  name: string
  fullName: string
  yiTong: number | null
  tongZhao: number
  hasAllocation: boolean
  type: '省示范' | '市重点' | '县中' | '民办'
  location: string
}

export const HIGH_SCHOOLS_2025: HighSchool[] = [
  { id:'xl1',   name:'新乐一中',                fullName:'新乐市第一中学',              yiTong:725, tongZhao:678, hasAllocation:true,  type:'省示范', location:'新乐' },
  { id:'xl2',   name:'新乐二中',                fullName:'新乐市第二中学',              yiTong:null,tongZhao:624, hasAllocation:false, type:'县中',   location:'新乐' },
  { id:'xl3',   name:'新乐三中',                fullName:'新乐市第三中学',              yiTong:null,tongZhao:489, hasAllocation:false, type:'县中',   location:'新乐' },
  { id:'xl4',   name:'新乐四中',                fullName:'新乐市第四中学',              yiTong:null,tongZhao:583, hasAllocation:false, type:'县中',   location:'新乐' },
  { id:'xl5',   name:'新伏羲中学(新乐)',         fullName:'新乐市新伏羲中学(新乐)',      yiTong:null,tongZhao:660, hasAllocation:false, type:'民办',   location:'新乐' },
  { id:'szjz1', name:'河北正定中学(正定)',        fullName:'河北正定中学(正定)',           yiTong:null,tongZhao:760, hasAllocation:true,  type:'省示范', location:'正定' },
  { id:'szjz2', name:'辛集中学',                fullName:'河北辛集中学(市)',             yiTong:null,tongZhao:725, hasAllocation:true,  type:'省示范', location:'辛集' },
  { id:'szjz3', name:'石家庄实验中学',           fullName:'石家庄实验中学',              yiTong:761, tongZhao:759, hasAllocation:false, type:'省示范', location:'市区' },
  { id:'szjz4', name:'石家庄二实验中学',         fullName:'石家庄第二实验中学(市)',       yiTong:null,tongZhao:727, hasAllocation:false, type:'省示范', location:'市区' },
  { id:'mb1',   name:'二中实验学校(其他县区)',    fullName:'二中实验学校(其他县区)',       yiTong:763, tongZhao:750, hasAllocation:true,  type:'民办',   location:'市区' },
  { id:'mb2',   name:'正中实验中学(其他县区)',    fullName:'河北正中实验中学(其他县区)',   yiTong:755, tongZhao:746, hasAllocation:true,  type:'民办',   location:'市区' },
  { id:'mb3',   name:'润德学校(其他县区)',        fullName:'润德学校(其他县区)',           yiTong:759, tongZhao:752, hasAllocation:true,  type:'民办',   location:'市区' },
  { id:'mb4',   name:'精英中学(其他县区)',        fullName:'精英中学(其他县区)',           yiTong:775, tongZhao:743, hasAllocation:true,  type:'民办',   location:'市区' },
  { id:'mb5',   name:'一中实验学校(其他县区)',    fullName:'一中实验学校(其他县区)',       yiTong:744, tongZhao:741, hasAllocation:true,  type:'民办',   location:'市区' },
  { id:'mb6',   name:'联邦外国语学校(其他县区)',  fullName:'河北联邦外国语学校(其他县区)', yiTong:713, tongZhao:540, hasAllocation:true,  type:'民办',   location:'市区' },
  { id:'mb7',   name:'敬业中学(其他县区)',        fullName:'敬业中学(其他县区)',           yiTong:732, tongZhao:698, hasAllocation:true,  type:'民办',   location:'平山' },
  { id:'mb8',   name:'金石高级中学(其他县区)',    fullName:'金石高级中学有限公司(其他县区)',yiTong:666,tongZhao:608, hasAllocation:true,  type:'民办',   location:'鹿泉' },
  { id:'mb9',   name:'卓越中学东校区(其他县区)',  fullName:'卓越中学东校区(其他县区)',     yiTong:663, tongZhao:624, hasAllocation:true,  type:'民办',   location:'鹿泉' },
  { id:'mb10',  name:'卓越中学西校区(其他县区)',  fullName:'卓越中学西校区(其他县区)',     yiTong:717, tongZhao:672, hasAllocation:true,  type:'民办',   location:'鹿泉' },
  { id:'mb11',  name:'精英新华中学(其他县区)',    fullName:'精英新华中学(其他县区)',       yiTong:735, tongZhao:695, hasAllocation:true,  type:'民办',   location:'鹿泉' },
  { id:'mb12',  name:'行唐启明中学(其他县区)',    fullName:'行唐启明中学(其他县区)',       yiTong:699, tongZhao:674, hasAllocation:true,  type:'民办',   location:'行唐' },
]

export const XINLE_ALLOCATION: Record<string, Record<string, number>> = {
  '承安中学':     {xl1:38,szjz2:2,szjz1:2,szjz3:2,szjz4:1,mb1:1,mb2:3,mb5:1,mb3:1,mb4:1,mb6:1,mb7:1,mb8:3,mb9:2,mb10:3,mb11:1,mb12:0},
  '正莫中学':     {xl1:16,szjz2:1,szjz1:1,szjz3:1,szjz4:1,mb1:1,mb2:1,mb5:0,mb3:0,mb4:1,mb6:0,mb7:0,mb8:1,mb9:1,mb10:1,mb11:0,mb12:0},
  '大岳中学':     {xl1:32,szjz2:1,szjz1:2,szjz3:1,szjz4:1,mb1:1,mb2:2,mb5:1,mb3:1,mb4:1,mb6:1,mb7:1,mb8:2,mb9:1,mb10:2,mb11:1,mb12:0},
  '杜固学校':     {xl1:28,szjz2:1,szjz1:2,szjz3:1,szjz4:1,mb1:1,mb2:2,mb5:1,mb3:0,mb4:1,mb6:1,mb7:1,mb8:2,mb9:1,mb10:2,mb11:1,mb12:0},
  '赤支中学':     {xl1:68,szjz2:3,szjz1:4,szjz3:3,szjz4:3,mb1:2,mb2:5,mb5:1,mb3:1,mb4:2,mb6:1,mb7:1,mb8:5,mb9:3,mb10:5,mb11:2,mb12:1},
  '彭家庄学校':   {xl1:29,szjz2:1,szjz1:2,szjz3:1,szjz4:1,mb1:1,mb2:2,mb5:1,mb3:0,mb4:1,mb6:1,mb7:1,mb8:2,mb9:1,mb10:2,mb11:1,mb12:0},
  '岗头中学':     {xl1:25,szjz2:1,szjz1:1,szjz3:1,szjz4:1,mb1:1,mb2:2,mb5:0,mb3:0,mb4:1,mb6:0,mb7:1,mb8:2,mb9:1,mb10:2,mb11:1,mb12:0},
  '马头铺中学':   {xl1:21,szjz2:1,szjz1:1,szjz3:1,szjz4:1,mb1:1,mb2:1,mb5:0,mb3:0,mb4:1,mb6:0,mb7:0,mb8:1,mb9:1,mb10:1,mb11:1,mb12:0},
  '第二实验学校': {xl1:65,szjz2:3,szjz1:4,szjz3:3,szjz4:3,mb1:2,mb2:5,mb5:1,mb3:1,mb4:2,mb6:1,mb7:1,mb8:5,mb9:3,mb10:4,mb11:2,mb12:0},
  '荟文中学':     {xl1:71,szjz2:3,szjz1:4,szjz3:3,szjz4:3,mb1:2,mb2:5,mb5:1,mb3:1,mb4:2,mb6:1,mb7:1,mb8:5,mb9:3,mb10:5,mb11:2,mb12:1},
  '新开路中学':   {xl1:131,szjz2:6,szjz1:7,szjz3:6,szjz4:5,mb1:4,mb2:9,mb5:2,mb3:2,mb4:4,mb6:2,mb7:3,mb8:9,mb9:6,mb10:9,mb11:4,mb12:1},
  '东长寿学校':   {xl1:104,szjz2:5,szjz1:6,szjz3:5,szjz4:4,mb1:3,mb2:7,mb5:2,mb3:2,mb4:4,mb6:2,mb7:2,mb8:7,mb9:5,mb10:7,mb11:3,mb12:1},
  '东城中学':     {xl1:121,szjz2:6,szjz1:7,szjz3:6,szjz4:5,mb1:4,mb2:9,mb5:2,mb3:2,mb4:4,mb6:2,mb7:2,mb8:8,mb9:6,mb10:8,mb11:4,mb12:1},
  '东阳学校':     {xl1:27,szjz2:1,szjz1:1,szjz3:1,szjz4:1,mb1:1,mb2:2,mb5:0,mb3:0,mb4:1,mb6:0,mb7:1,mb8:2,mb9:1,mb10:2,mb11:1,mb12:0},
  '实验学校':     {xl1:177,szjz2:8,szjz1:10,szjz3:8,szjz4:7,mb1:5,mb2:13,mb5:3,mb3:3,mb4:6,mb6:3,mb7:4,mb8:12,mb9:8,mb10:12,mb11:5,mb12:1},
  '中山中学':     {xl1:30,szjz2:1,szjz1:2,szjz3:1,szjz4:1,mb1:1,mb2:2,mb5:1,mb3:1,mb4:1,mb6:1,mb7:1,mb8:2,mb9:1,mb10:2,mb11:1,mb12:0},
  '童心学校':     {xl1:11,szjz2:1,szjz1:1,szjz3:1,szjz4:0,mb1:0,mb2:1,mb5:0,mb3:0,mb4:0,mb6:0,mb7:0,mb8:1,mb9:1,mb10:1,mb11:0,mb12:0},
  '大流中学':     {xl1:19,szjz2:1,szjz1:1,szjz3:1,szjz4:1,mb1:1,mb2:1,mb5:0,mb3:0,mb4:1,mb6:0,mb7:0,mb8:1,mb9:1,mb10:1,mb11:0,mb12:0},
  '东王中学':     {xl1:32,szjz2:1,szjz1:2,szjz3:1,szjz4:1,mb1:1,mb2:2,mb5:1,mb3:1,mb4:1,mb6:1,mb7:1,mb8:2,mb9:1,mb10:2,mb11:1,mb12:0},
  '邯邰学校':     {xl1:14,szjz2:1,szjz1:1,szjz3:1,szjz4:1,mb1:0,mb2:1,mb5:0,mb3:0,mb4:0,mb6:0,mb7:0,mb8:1,mb9:1,mb10:1,mb11:0,mb12:0},
  '化皮学校':     {xl1:15,szjz2:1,szjz1:1,szjz3:1,szjz4:1,mb1:0,mb2:1,mb5:0,mb3:0,mb4:1,mb6:0,mb7:0,mb8:1,mb9:1,mb10:1,mb11:0,mb12:0},
  '青同学校':     {xl1:25,szjz2:1,szjz1:1,szjz3:1,szjz4:1,mb1:1,mb2:2,mb5:0,mb3:0,mb4:1,mb6:0,mb7:1,mb8:2,mb9:1,mb10:2,mb11:1,mb12:0},
  '协神学校':     {xl1:8, szjz2:0,szjz1:0,szjz3:0,szjz4:0,mb1:0,mb2:1,mb5:0,mb3:0,mb4:0,mb6:0,mb7:0,mb8:1,mb9:0,mb10:1,mb11:0,mb12:0},
  '博林中学':     {xl1:23,szjz2:1,szjz1:1,szjz3:1,szjz4:1,mb1:1,mb2:2,mb5:0,mb3:0,mb4:1,mb6:0,mb7:0,mb8:2,mb9:1,mb10:2,mb11:1,mb12:0},
  '超击武校':     {xl1:0, szjz2:0,szjz1:0,szjz3:0,szjz4:0,mb1:0,mb2:0,mb5:0,mb3:0,mb4:0,mb6:0,mb7:0,mb8:0,mb9:0,mb10:0,mb11:0,mb12:0},
}

export const CONTROL_LINES_2025: Record<string, number> = {
  '矿区':540,'藁城区':420,'鹿泉区':420,'栾城区':500,'井陉县':475,
  '正定县':422,'行唐县':400,'灵寿县':451,'高邑县':460,'深泽县':540,
  '赞皇县':460,'无极县':494,'平山县':441,'元氏县':460,'赵县':401,
  '晋州市':500,'新乐市':460,
}

export function getMarketRank(score: number): number {
  if (score >= 780) return SCORE_RANK_2025[780]
  if (score <= 313) return TOTAL_EXAMINEES_2025
  for (let s = score; s <= 780; s++) {
    if (SCORE_RANK_2025[s] !== undefined) return SCORE_RANK_2025[s]
  }
  return TOTAL_EXAMINEES_2025
}

export function getMarketPercentile(score: number): string {
  const rank = getMarketRank(score)
  return ((rank / TOTAL_EXAMINEES_2025) * 100).toFixed(2)
}

export type SchoolRecommendation = {
  school: HighSchool
  category: '冲刺' | '稳妥' | '保底' | '分配生机会'
  allocationQuota: number
  hasAllocationChance: boolean
  allocationMinScore: number | null
  gap: number
  note: string
}

export function getRecommendations(
  score: number,
  schoolName: string,
  schoolRank: number
): SchoolRecommendation[] {
  const allocation = XINLE_ALLOCATION[schoolName] || {}
  const results: SchoolRecommendation[] = []

  for (const school of HIGH_SCHOOLS_2025) {
    const quota = allocation[school.id] || 0
    const allocationMinScore = school.yiTong ? school.yiTong - 50 : null
    const hasAllocationChance =
      quota > 0 &&
      schoolRank <= quota &&
      allocationMinScore !== null &&
      score >= allocationMinScore
    const gap = score - school.tongZhao

    let category: SchoolRecommendation['category']
    let note = ''

    if (hasAllocationChance) {
      category = '分配生机会'
      note = `本校有 ${quota} 个分配生名额，你排第 ${schoolRank} 名，分数达到分配线（${allocationMinScore}分），可尝试走分配生通道`
    } else if (gap >= 20) {
      category = '稳妥'
      note = `分数高于统招线 ${gap} 分，录取把握较大`
    } else if (gap >= -15 && gap < 20) {
      category = '冲刺'
      note = gap >= 0
        ? `分数略高于统招线 ${gap} 分，建议作为冲刺志愿`
        : `分数低于统招线 ${Math.abs(gap)} 分，有一定风险但可以冲刺`
    } else {
      continue
    }

    if (!hasAllocationChance && gap < -20) continue
    if (!hasAllocationChance && gap > 100) continue

    results.push({ school, category, allocationQuota: quota, hasAllocationChance, allocationMinScore, gap, note })
  }

  const order = { '分配生机会':0, '稳妥':1, '冲刺':2, '保底':3 }
  return results.sort((a, b) => {
    if (order[a.category] !== order[b.category]) return order[a.category] - order[b.category]
    return b.school.tongZhao - a.school.tongZhao
  })
}
