// 牧哲学堂初中古诗词【课下注释·白话文对译·深度赏析·字块闯关】权威知识库
// 对应统编教材 81 篇全量古诗词与 53 专项背诵核心篇目
// 模块化拆分整合：七上、七下、八上、八下、九上、九下全六册

import { PACK_G7_1 } from './packs/pack-g7-1'
import { PACK_G7_2 } from './packs/pack-g7-2'
import { PACK_G8_1 } from './packs/pack-g8-1'
import { PACK_G8_2 } from './packs/pack-g8-2'
import { PACK_G9_1 } from './packs/pack-g9-1'
import { PACK_G9_2 } from './packs/pack-g9-2'

export type {
  FootnoteNoteItem,
  SentenceTranslationPair,
  DeepAppreciationPack,
  PoetryLearningItemPack,
} from './packs/types'

export const POETRY_LEARNING_PACK_MAP = {
  ...PACK_G7_1,
  ...PACK_G7_2,
  ...PACK_G8_1,
  ...PACK_G8_2,
  ...PACK_G9_1,
  ...PACK_G9_2,
}
