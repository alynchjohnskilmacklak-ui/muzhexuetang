import { 数学Questions } from './practice-sets/数学-questions';
import { 语文Questions } from './practice-sets/语文-questions';
import { 英语Questions } from './practice-sets/英语-questions';
import { 物理Questions } from './practice-sets/物理-questions';
import { 化学Questions } from './practice-sets/化学-questions';
import { 历史Questions } from './practice-sets/历史-questions';
import { 地理Questions } from './practice-sets/地理-questions';
import { 生物Questions } from './practice-sets/生物-questions';
import { 政治Questions } from './practice-sets/政治-questions';

export const PARENT_PRACTICE_SETS = [
  ...数学Questions,
  ...语文Questions,
  ...英语Questions,
  ...物理Questions,
  ...化学Questions,
  ...历史Questions,
  ...地理Questions,
  ...生物Questions,
  ...政治Questions,
];
