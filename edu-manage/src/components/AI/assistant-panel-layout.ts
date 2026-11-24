export interface AssistantPanelGeometry {
  height: string
  maxHeight: string
}

export function getAssistantPanelGeometry(isMobile: boolean): AssistantPanelGeometry {
  const height = isMobile
    ? 'min(92dvh, 1080px)'
    : 'min(860px, calc(100dvh - 24px))'

  return { height, maxHeight: height }
}
