import { describe, expect, it } from 'vitest'
import { getAssistantPanelGeometry } from './assistant-panel-layout'

describe('AI 助手面板布局', () => {
  it('手机端概况页与问答页使用同一稳定高度', () => {
    expect(getAssistantPanelGeometry(true)).toEqual({
      height: 'min(92dvh, 1080px)',
      maxHeight: 'min(92dvh, 1080px)',
    })
  })

  it('桌面端概况页与问答页使用同一视口约束高度', () => {
    expect(getAssistantPanelGeometry(false)).toEqual({
      height: 'min(860px, calc(100dvh - 24px))',
      maxHeight: 'min(860px, calc(100dvh - 24px))',
    })
  })
})
