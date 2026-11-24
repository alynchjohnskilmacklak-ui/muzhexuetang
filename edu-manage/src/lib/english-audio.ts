/**
 * 英语纯正真人发音与领读音频引擎
 * 采用权威词典高清真人原声 MP3（有道权威词典音库，英音/美音双通道），
 * 杜绝传统浏览器 Web Speech 机械合成音的不标准、方言读音与过去式误读问题，
 * 并在离线或极端弱网环境下自动无缝降级至 Web Speech API。
 */

let activeAudio: HTMLAudioElement | null = null

export function stopEnglishAudio() {
  if (activeAudio) {
    activeAudio.pause()
    activeAudio.currentTime = 0
    activeAudio = null
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

/**
 * 播放单个英文单词或短语的纯正真人读音
 * @param text 英文单词或短语
 * @param accent 'uk'（英音，教材推荐） | 'us'（美音）
 */
export function playEnglishAudio(text: string, accent: 'uk' | 'us' = 'uk'): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve()
      return
    }

    const clean = text.trim()
    if (!clean) {
      resolve()
      return
    }

    stopEnglishAudio()

    // 优先采用本站同源代理权威真人原声音频（免 CORS/CSP 拦截）
    const audioUrl = `/api/audio/english?word=${encodeURIComponent(clean)}&accent=${accent}`

    const audio = new Audio(audioUrl)
    activeAudio = audio

    const cleanup = () => {
      if (activeAudio === audio) {
        activeAudio = null
      }
      resolve()
    }

    audio.onended = cleanup

    audio.onerror = () => {
      // 代理失败时尝试直连，最后降级到语音合成
      const directUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(clean)}&type=${accent === 'us' ? 2 : 1}`
      const directAudio = new Audio(directUrl)
      activeAudio = directAudio
      directAudio.onended = cleanup
      directAudio.onerror = () => fallbackSpeech(clean, accent, cleanup)
      directAudio.play().catch(() => fallbackSpeech(clean, accent, cleanup))
    }

    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        fallbackSpeech(clean, accent, cleanup)
      })
    }
  })
}

function fallbackSpeech(text: string, accent: 'uk' | 'us', onDone: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onDone()
    return
  }

  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = accent === 'us' ? 'en-US' : 'en-GB'
    utterance.rate = 0.88

    // 尽量挑选纯正英文 voice
    const voices = window.speechSynthesis.getVoices()
    const targetVoice = voices.find(
      (v) => (accent === 'us' ? v.lang === 'en-US' : v.lang === 'en-GB') || v.lang.startsWith('en')
    )
    if (targetVoice) {
      utterance.voice = targetVoice
    }

    utterance.onend = onDone
    utterance.onerror = onDone
    window.speechSynthesis.speak(utterance)
  } catch {
    onDone()
  }
}

/**
 * 动词三态真人连读：原形 ➔ 过去式 ➔ 过去分词
 * 专门对特殊读音进行音标映射修复（例如 read 过去式发 /red/ 而不是 /ri:d/）
 */
export async function playVerbThreeForms(
  base: string,
  past: string,
  pastParticiple: string,
  onStepChange?: (step: 'base' | 'past' | 'pp' | 'idle') => void,
  accent: 'uk' | 'us' = 'uk'
): Promise<void> {
  const getAudioWord = (word: string, form: 'base' | 'past' | 'pp') => {
    const primary = word.split('/')[0].split('(')[0].trim().toLowerCase()
    // 特殊音准纠正：read 过去式与分词读音同 red
    if (primary === 'read' && (form === 'past' || form === 'pp')) {
      return 'red'
    }
    // lead 过去式为 led
    if (primary === 'lead' && (form === 'past' || form === 'pp')) {
      return 'led'
    }
    return primary
  }

  try {
    // 1. 原形发音
    onStepChange?.('base')
    await playEnglishAudio(getAudioWord(base, 'base'), accent)
    await new Promise((r) => setTimeout(r, 420))

    // 2. 过去式发音
    onStepChange?.('past')
    await playEnglishAudio(getAudioWord(past, 'past'), accent)
    await new Promise((r) => setTimeout(r, 420))

    // 3. 过去分词发音
    onStepChange?.('pp')
    await playEnglishAudio(getAudioWord(pastParticiple, 'pp'), accent)
    await new Promise((r) => setTimeout(r, 200))
  } finally {
    onStepChange?.('idle')
  }
}
