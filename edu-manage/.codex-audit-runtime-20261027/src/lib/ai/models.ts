import type { ModelId } from '@/data/ai-prompts'

export const AI_MODEL_CAPABILITIES: Record<ModelId, {
  supportsVision: boolean
  supportsStream: boolean
}> = {
  deepseek: {
    supportsVision: false,
    supportsStream: true,
  },
  mimo: {
    supportsVision: false,
    supportsStream: false,
  },
  kimi: {
    supportsVision: true,
    supportsStream: true,
  },
}

export function getModelCapability(modelId: ModelId) {
  return AI_MODEL_CAPABILITIES[modelId]
}
