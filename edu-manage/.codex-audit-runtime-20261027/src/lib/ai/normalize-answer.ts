export function normalizeAIAnswer(text: string) {
  return text
    // 清理损坏的图片链接
    .replace(/!\[[^\]]*\]\((?!https?:|data:)[^)]+\)/g, '')
    // LaTeX 特殊字符转义
    .replace(/\\\\Omega/g, 'Ω')
    .replace(/\\Omega/g, 'Ω')
    .replace(/\\\\times/g, '×')
    .replace(/\\times/g, '×')
    .replace(/\\\\cdot/g, '·')
    .replace(/\\cdot/g, '·')
    .replace(/\\\\rightarrow/g, '→')
    .replace(/\\\\uparrow/g, '↑')
    .replace(/\\\\downarrow/g, '↓')
    .replace(/\\\\triangle/g, '△')
    .replace(/\\\\angle/g, '∠')
    .replace(/\\\\approx/g, '≈')
    .replace(/\\\\neq/g, '≠')
    .replace(/\\\\leq/g, '≤')
    .replace(/\\\\geq/g, '≥')
    .replace(/\\\\infty/g, '∞')
    .replace(/\\\\sqrt/g, '√')
    .replace(/\\\\sum/g, '∑')
    .replace(/\\\\int/g, '∫')
    .replace(/\\\\pi/g, 'π')
    .replace(/\\\\alpha/g, 'α')
    .replace(/\\\\beta/g, 'β')
    .replace(/\\\\theta/g, 'θ')
    .replace(/\\\\rho/g, 'ρ')
    .replace(/\\\\mu/g, 'μ')
    .replace(/\\\\lambda/g, 'λ')
    .replace(/\\\\degree/g, '°')
    // 清理乱码和异常字符
    .replace(/[�￾￿]/g, '')
    .replace(/\\x[0-9a-fA-F]{2}/g, '')
    // 清理多余空行
    .replace(/\n{3,}/g, '\n\n')
    // 修复常见中文标点
    .replace(/([^\\])\\、/g, '$1、')
    .trim()
}
