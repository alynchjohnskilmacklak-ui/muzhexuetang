'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Avatar, Input, Spin, Tooltip } from 'antd'
import { toast } from 'sonner'
import {
  CameraOutlined,
  ClearOutlined,
  CloseCircleFilled,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  LoadingOutlined,
  SendOutlined,
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { MODEL_CONFIG, type AIRole, type ModelId } from '@/data/ai-prompts'
import { useIsMobile } from '@/hooks/useIsMobile'
import { normalizeAIAnswer } from '@/lib/ai/normalize-answer'

const { TextArea } = Input

type AttachmentType = 'image' | 'pdf' | 'word'

interface Attachment {
  type: AttachmentType
  name: string
  preview?: string
  base64?: string
  text?: string
  size: number
}

interface MessageContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string | MessageContent[]
  attachmentInfo?: string
  imagePreview?: string
  loading?: boolean
  error?: boolean
  retryPayload?: {
    text?: string
    modelId: ModelId
  }
  modelId?: ModelId
  modelName?: string
  modelIcon?: string
  modelColor?: string
}

type Conversations = Record<ModelId, Message[]>

const EMPTY_CONVERSATIONS: Conversations = {
  deepseek: [],
  mimo: [],
  kimi: [],
}

function contentToText(content: string | MessageContent[]): string {
  if (typeof content === 'string') return content
  return content
    .filter((item) => item.type === 'text')
    .map((item) => item.text || '')
    .join('')
}

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function sanitizeContentForStorage(content: string | MessageContent[]): string | MessageContent[] {
  if (typeof content === 'string') return content
  const text = contentToText(content)
  return text || '（图片内容未保存，请重新上传图片后提问）'
}

function sanitizeForStorage(conversations: Conversations): Conversations {
  return {
    deepseek: conversations.deepseek.slice(-30).map((item) => ({
      ...item,
      imagePreview: undefined,
      loading: false,
      content: sanitizeContentForStorage(item.content),
    })),
    mimo: conversations.mimo.slice(-30).map((item) => ({
      ...item,
      imagePreview: undefined,
      loading: false,
      content: sanitizeContentForStorage(item.content),
    })),
    kimi: conversations.kimi.slice(-30).map((item) => ({
      ...item,
      imagePreview: undefined,
      loading: false,
      content: sanitizeContentForStorage(item.content),
    })),
  }
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let text = ''

  for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 20); pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    text += content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim()
    text += '\n'
  }

  return text.trim() || '（PDF 内容提取失败，可能是扫描件）'
}

async function extractWordText(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value.trim() || '（Word 内容提取失败）'
}

interface AIChatPanelProps {
  aiRole: AIRole
  suggestedQuestions?: string[]
  quickAsk?: string | null
  onQuickAskHandled?: () => void
}

export function AIChatPanel({ aiRole, suggestedQuestions = [], quickAsk, onQuickAskHandled }: AIChatPanelProps) {
  const isMobile = useIsMobile() ?? false
  const [conversations, setConversations] = useState<Conversations>(EMPTY_CONVERSATIONS)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [modelId, setModelId] = useState<ModelId>('deepseek')
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [extracting, setExtracting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const storageKey = `muzhe_ai_conversations_${aiRole}`
  const messages = conversations[modelId] || []
  const currentModel = MODEL_CONFIG.find((model) => model.id === modelId) || MODEL_CONFIG[0]

  const updateConversation = useCallback((targetModelId: ModelId, updater: (prev: Message[]) => Message[]) => {
    setConversations((prev) => ({
      ...prev,
      [targetModelId]: updater(prev[targetModelId] || []),
    }))
  }, [])

  const updateCurrentConversation = useCallback((updater: (prev: Message[]) => Message[]) => {
    updateConversation(modelId, updater)
  }, [modelId, updateConversation])

  useEffect(() => {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Partial<Conversations>
      setConversations({
        deepseek: Array.isArray(parsed.deepseek) ? parsed.deepseek : [],
        mimo: Array.isArray(parsed.mimo) ? parsed.mimo : [],
        kimi: Array.isArray(parsed.kimi) ? parsed.kimi : [],
      })
    } catch {
      // Ignore invalid old localStorage payloads.
    }
  }, [storageKey])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(sanitizeForStorage(conversations)))
  }, [storageKey, conversations])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (quickAsk) {
      void sendMessage(quickAsk)
      onQuickAskHandled?.()
    }
  }, [quickAsk])

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)
    const isPdf = ext === 'pdf'
    const isWord = ['doc', 'docx'].includes(ext)

    if (!isImage && !isPdf && !isWord) {
      toast.error('仅支持图片、PDF、Word 文档')
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('文件大小不能超过 20MB')
      return
    }

    if (isImage) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setAttachment({ type: 'image', name: file.name, preview: base64, base64, size: file.size })
      }
      reader.readAsDataURL(file)
      return
    }

    setExtracting(true)
    try {
      const messageKey = 'ai-file-extract'
      toast.loading(isPdf ? '正在提取 PDF 内容...' : '正在提取 Word 内容...', { id: messageKey })

      const text = isPdf ? await extractPdfText(file) : await extractWordText(file)
      toast.dismiss(messageKey)

      setAttachment({
        type: isPdf ? 'pdf' : 'word',
        name: file.name,
        text,
        size: file.size,
        preview: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
      })
      toast.success(`已提取 ${text.length} 字，可直接提问`)
    } catch (error) {
      console.error('[AI file extract]', error)
      toast.dismiss('ai-file-extract')
      toast.error('文件内容提取失败，请尝试其他文件')
    } finally {
      setExtracting(false)
    }
  }, [])

  const sendMessage = async (text?: string, options?: { targetModelId?: ModelId; skipUserMessage?: boolean }) => {
    const activeModelId = options?.targetModelId || modelId
    const activeMessages = conversations[activeModelId] || []
    const selectedModel = MODEL_CONFIG.find((model) => model.id === activeModelId) || MODEL_CONFIG[0]
    const content = (text || input).trim()
    if ((!content && !attachment) || loading) return

    setInput('')

    let userContent: string | MessageContent[]
    let attachmentInfo: string | undefined
    let imagePreview: string | undefined

    if (attachment?.type === 'image' && attachment.base64) {
      if (!selectedModel.supportsVision) {
        toast.error('当前模型不支持图片识别，请切换 Kimi 视觉模型')
        return
      }
      userContent = [
        { type: 'image_url', image_url: { url: attachment.base64 } },
        { type: 'text', text: content || '请帮我分析这道题' },
      ]
      imagePreview = attachment.preview
      attachmentInfo = attachment.name
    } else if (attachment?.text) {
      const docType = attachment.type === 'pdf' ? 'PDF' : 'Word'
      const truncated = attachment.text.length > 8000
        ? `${attachment.text.slice(0, 8000)}\n\n[内容过长，已截取前8000字]`
        : attachment.text
      userContent = content
        ? `以下是${docType}文档「${attachment.name}」的内容：\n\n${truncated}\n\n---\n\n我的问题：${content}`
        : `以下是${docType}文档「${attachment.name}」的内容，请帮我分析：\n\n${truncated}`
      attachmentInfo = `${attachment.name}（${docType}，已提取 ${attachment.text.length} 字）`
    } else {
      userContent = content
    }

    setAttachment(null)

    const userMsg: Message = {
      id: newId(),
      role: 'user',
      content: userContent,
      attachmentInfo,
      imagePreview,
    }
    const assistantMsg: Message = {
      id: newId(),
      role: 'assistant',
      content: '',
      loading: true,
      modelId: activeModelId,
      modelName: selectedModel.name,
      modelIcon: selectedModel.icon || selectedModel.label.slice(0, 1),
      modelColor: selectedModel.color,
    }

    updateConversation(activeModelId, (prev) => options?.skipUserMessage ? [...prev, assistantMsg] : [...prev, userMsg, assistantMsg])
    setLoading(true)

    try {
      const historySource = options?.skipUserMessage ? activeMessages : [...activeMessages, userMsg]
      const history = historySource.map((item) => ({
        role: item.role,
        content: selectedModel?.supportsVision ? item.content : contentToText(item.content),
      }))

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          role: aiRole,
          modelId: activeModelId,
          hasImage: Boolean(imagePreview),
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || '请求失败')
      }

      if (!response.body) {
        throw new Error('AI 服务未返回内容')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''

        for (const event of events) {
          const lines = event.split('\n').filter((line) => line.startsWith('data: '))

          for (const line of lines) {
            const data = line.slice(6).trim()
            if (!data || data === '[DONE]') continue

            try {
              const json = JSON.parse(data)
              const delta = json.choices?.[0]?.delta?.content
                || json.choices?.[0]?.delta?.reasoning_content
                || ''
              if (delta) {
                fullText += delta
                updateConversation(activeModelId, (prev) => prev.map((item) => (
                  item.id === assistantMsg.id
                    ? { ...item, content: fullText, loading: true }
                    : item
                )))
              }
            } catch {
              // Ignore malformed keepalive chunks.
            }
          }
        }
      }

      const finalText = normalizeAIAnswer(fullText)
      updateConversation(activeModelId, (prev) => prev.map((item) => (
        item.id === assistantMsg.id
          ? { ...item, content: finalText || '（模型未返回内容，请重试）', loading: false }
          : item
      )))
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '服务暂时不可用'
      updateConversation(activeModelId, (prev) => prev.map((item) => (
        item.id === assistantMsg.id
          ? {
            ...item,
            content: `⚠️ 当前模型暂时不可用\n\n原因：${errMsg}\n\n你可以：\n1. 点击“重试”\n2. 切换到其他模型\n3. 稍后再试`,
            loading: false,
            error: true,
            retryPayload: { text: content, modelId: activeModelId },
          }
          : item
      )))
    } finally {
      setLoading(false)
    }
  }

  const modelMessageCounts = useMemo(() => ({
    deepseek: conversations.deepseek.length,
    mimo: conversations.mimo.length,
    kimi: conversations.kimi.length,
  }), [conversations])
  const AttachmentIcon = attachment?.type === 'pdf'
    ? FilePdfOutlined
    : attachment?.type === 'word'
      ? FileWordOutlined
      : FileTextOutlined

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: isMobile ? 'calc(100vh - 100px)' : 'calc(100vh - 130px)',
      minHeight: 500,
      borderRadius: 8,
      overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,.08)',
      border: '1px solid rgba(0,0,0,.06)',
    }}>
      <div style={{
        padding: isMobile ? '10px 12px' : '12px 18px',
        backgroundColor: '#fff',
        borderBottom: '1px solid rgba(0,0,0,.06)',
      }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
          {MODEL_CONFIG.map((model) => {
            const active = modelId === model.id
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => {
                  setModelId(model.id)
                  toast.info(`已切换到 ${model.label}，本模型有独立上下文`)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: isMobile ? '7px 12px' : '8px 16px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  flexShrink: 0,
                  border: `1.5px solid ${active ? model.color : 'rgba(0,0,0,.1)'}`,
                  backgroundColor: active ? `${model.color}12` : '#f9f9f9',
                  transition: 'all 0.2s',
                  outline: 'none',
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 700, color: model.color }}>{model.icon || model.label.slice(0, 1)}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active ? model.color : '#5a4e3a',
                    lineHeight: 1.2,
                  }}>
                    {model.label}
                    <span style={{
                      marginLeft: 5,
                      fontSize: 10,
                      padding: '1px 5px',
                      borderRadius: 8,
                      backgroundColor: model.badgeColor,
                      color: '#fff',
                      fontWeight: 600,
                      verticalAlign: 'middle',
                    }}>
                      {model.badge}
                    </span>
                  </div>
                  {!isMobile && (
                    <div style={{ fontSize: 11, color: '#9a8e7a', lineHeight: 1.2, marginTop: 1 }}>
                      {model.desc} · {modelMessageCounts[model.id]} 条
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
        <div style={{ fontSize: 11, color: '#c0b8ae', marginTop: 6 }}>
          当前模型：{currentModel.name} · {currentModel.supportsVision ? '支持图片' : '不支持图片'} · PDF/Word 文档可上传分析
        </div>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: isMobile ? 12 : 20,
        backgroundColor: '#f7f4f0',
        scrollbarWidth: 'thin',
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: isMobile ? '16px 0' : '24px 0' }}>
            <div style={{
              width: isMobile ? 40 : 52,
              height: isMobile ? 40 : 52,
              margin: '0 auto 10px',
              borderRadius: 8,
              backgroundColor: currentModel.color,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? 20 : 26,
              fontWeight: 800,
            }}>
              {currentModel.icon || currentModel.label.slice(0, 1)}
            </div>
            <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: '#1a1201', marginBottom: 6 }}>
              小牧 AI 助手
            </div>
            <div style={{ fontSize: 13, color: '#9a8e7a', marginBottom: 4 }}>
              当前：<span style={{ color: currentModel.color, fontWeight: 600 }}>{currentModel.name}</span>
            </div>
            <div style={{ fontSize: 12, color: '#c0b8ae', marginBottom: 20 }}>
              支持直接粘贴题目 · 上传图片拍照解题 · 上传PDF/Word文档分析
            </div>

            {suggestedQuestions.length > 0 && (
              <div style={{ textAlign: 'left', maxWidth: 520, margin: '0 auto' }}>
                <div style={{ fontSize: 12, color: '#9a8e7a', marginBottom: 10, textAlign: 'center' }}>
                  点击快速提问
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
                  {suggestedQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => sendMessage(question)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        textAlign: 'left',
                        backgroundColor: '#fff',
                        border: '1px solid rgba(232,117,69,.2)',
                        fontSize: 13,
                        color: '#5a4e3a',
                        lineHeight: 1.5,
                        outline: 'none',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.borderColor = '#E87545'
                        event.currentTarget.style.backgroundColor = 'rgba(232,117,69,.04)'
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.borderColor = 'rgba(232,117,69,.2)'
                        event.currentTarget.style.backgroundColor = '#fff'
                      }}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {messages.map((item) => {
          const bubbleModelColor = item.modelColor || currentModel.color
          const bubbleModelIcon = item.modelIcon || currentModel.icon || currentModel.label.slice(0, 1)
          const bubbleModelName = item.modelName || currentModel.name
          return (
          <div
            key={item.id}
            style={{
              display: 'flex',
              flexDirection: item.role === 'user' ? 'row-reverse' : 'row',
              gap: 10,
              marginBottom: 16,
              alignItems: 'flex-start',
            }}
          >
            <Avatar
              size={isMobile ? 28 : 34}
              style={{
                backgroundColor: item.role === 'user' ? '#E87545' : bubbleModelColor,
                flexShrink: 0,
                fontSize: item.role === 'user' ? 14 : 16,
                fontWeight: 700,
              }}
            >
              {item.role === 'user' ? '我' : bubbleModelIcon}
            </Avatar>

            <div style={{
              maxWidth: isMobile ? '82%' : '78%',
              padding: '10px 14px',
              borderRadius: item.role === 'user' ? '8px 4px 8px 8px' : '4px 8px 8px 8px',
              backgroundColor: item.role === 'user' ? '#E87545' : '#fff',
              color: item.role === 'user' ? '#fff' : '#1a1201',
              fontSize: isMobile ? 13 : 14,
              lineHeight: 1.8,
              boxShadow: '0 1px 6px rgba(0,0,0,.06)',
              wordBreak: 'break-word',
            }}>
              {item.attachmentInfo && (
                <div style={{
                  marginBottom: 8,
                  padding: '4px 8px',
                  borderRadius: 6,
                  backgroundColor: item.role === 'user' ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.04)',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <FileTextOutlined />
                  <span>{item.attachmentInfo}</span>
                </div>
              )}

              {item.imagePreview && (
                <img
                  src={item.imagePreview}
                  alt="上传图片"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 200,
                    borderRadius: 8,
                    display: 'block',
                    marginBottom: 8,
                    objectFit: 'contain',
                  }}
                />
              )}

              {item.loading && contentToText(item.content) === '' ? (
                <Spin indicator={<LoadingOutlined style={{ color: bubbleModelColor }} spin />} size="small" />
              ) : item.role === 'assistant' ? (
                <div className="ai-markdown" style={{ color: '#1a1201' }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      h1: ({ children }) => <h1 style={{ fontSize: 18, fontWeight: 700, margin: '8px 0 4px', borderBottom: '1px solid rgba(0,0,0,.08)', paddingBottom: 4 }}>{children}</h1>,
                      h2: ({ children }) => <h2 style={{ fontSize: 16, fontWeight: 700, margin: '8px 0 4px' }}>{children}</h2>,
                      h3: ({ children }) => <h3 style={{ fontSize: 15, fontWeight: 600, margin: '6px 0 3px', color: '#E87545' }}>{children}</h3>,
                      p: ({ children }) => <p style={{ margin: '4px 0', lineHeight: 1.9 }}>{children}</p>,
                      strong: ({ children }) => <strong style={{ fontWeight: 700, color: '#1a1201' }}>{children}</strong>,
                      em: ({ children }) => <em style={{ color: '#5a4e3a', fontStyle: 'italic' }}>{children}</em>,
                      ol: ({ children }) => <ol style={{ margin: '6px 0', paddingLeft: 20, lineHeight: 2 }}>{children}</ol>,
                      ul: ({ children }) => <ul style={{ margin: '6px 0', paddingLeft: 20, lineHeight: 2, listStyleType: 'disc' }}>{children}</ul>,
                      li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
                      code: ({ className, children }) => {
                        const isBlock = className?.startsWith('language-')
                        return isBlock ? (
                          <pre style={{
                            backgroundColor: '#1a1a2e',
                            color: '#e8e8e8',
                            borderRadius: 8,
                            padding: '10px 14px',
                            overflowX: 'auto',
                            fontSize: 13,
                            margin: '8px 0',
                            lineHeight: 1.6,
                          }}>
                            <code>{children}</code>
                          </pre>
                        ) : (
                          <code style={{
                            backgroundColor: 'rgba(232,117,69,.08)',
                            color: '#E87545',
                            borderRadius: 4,
                            padding: '1px 5px',
                            fontSize: '0.9em',
                          }}>
                            {children}
                          </code>
                        )
                      },
                      hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,.08)', margin: '10px 0' }} />,
                      blockquote: ({ children }) => (
                        <blockquote style={{
                          borderLeft: '3px solid #E87545',
                          marginLeft: 0,
                          paddingLeft: 12,
                          color: '#7a6e60',
                          fontStyle: 'italic',
                          margin: '6px 0',
                        }}>
                          {children}
                        </blockquote>
                      ),
                      table: ({ children }) => <table style={{ borderCollapse: 'collapse', width: '100%', margin: '8px 0', fontSize: 13 }}>{children}</table>,
                      th: ({ children }) => <th style={{ border: '1px solid rgba(0,0,0,.1)', padding: '6px 10px', backgroundColor: '#f9f7f5', fontWeight: 600 }}>{children}</th>,
                      td: ({ children }) => <td style={{ border: '1px solid rgba(0,0,0,.08)', padding: '6px 10px' }}>{children}</td>,
                    }}
                  >
                    {contentToText(item.content)}
                  </ReactMarkdown>
                  {item.loading && (
                    <span style={{
                      display: 'inline-block',
                      width: 7,
                      height: 16,
                      backgroundColor: bubbleModelColor,
                      marginLeft: 2,
                      verticalAlign: 'middle',
                      animation: 'ai-file-blink 0.8s step-end infinite',
                    }} />
                  )}
                  {item.error && item.retryPayload && (
                    <button
                      type="button"
                      onClick={() => void sendMessage(item.retryPayload?.text, { targetModelId: item.retryPayload?.modelId, skipUserMessage: true })}
                      style={{
                        marginTop: 10,
                        border: `1px solid ${bubbleModelColor}`,
                        background: '#fff',
                        color: bubbleModelColor,
                        borderRadius: 8,
                        padding: '5px 10px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                      disabled={loading}
                    >
                      重试
                    </button>
                  )}
                </div>
              ) : (
                <span style={{ whiteSpace: 'pre-wrap' }}>
                  {contentToText(item.content)}
                </span>
              )}

              {item.role === 'assistant' && !item.loading && (
                <div style={{ marginTop: 8, opacity: 0.5, fontSize: 11 }}>
                  {bubbleModelIcon} {bubbleModelName}
                </div>
              )}
            </div>
          </div>
        )})}
        <div ref={messagesEndRef} />
      </div>

      <div style={{
        backgroundColor: '#fff',
        borderTop: '1px solid rgba(0,0,0,.06)',
        padding: isMobile ? '10px 12px' : '12px 18px',
      }}>
        {attachment && (
          <div style={{
            marginBottom: 10,
            padding: '8px 12px',
            borderRadius: 8,
            backgroundColor: attachment.type === 'image' ? 'rgba(39,166,68,.06)' : 'rgba(24,144,255,.06)',
            border: `1px solid ${attachment.type === 'image' ? 'rgba(39,166,68,.2)' : 'rgba(24,144,255,.2)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            {attachment.type === 'image' && attachment.preview ? (
              <img src={attachment.preview} alt="" style={{ height: 48, width: 48, objectFit: 'cover', borderRadius: 6 }} />
            ) : (
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 6,
                backgroundColor: 'rgba(24,144,255,.1)',
                color: '#1890ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}>
                <AttachmentIcon />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1201', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {attachment.name}
              </div>
              <div style={{ fontSize: 11, color: '#9a8e7a', marginTop: 2 }}>
                {attachment.type === 'image' ? '图片已就绪' : `已提取 ${attachment.text?.length || 0} 字`}
                &nbsp;·&nbsp;{(attachment.size / 1024).toFixed(0)} KB
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4d4f', fontSize: 18, padding: 4 }}
            >
              <CloseCircleFilled />
            </button>
          </div>
        )}

        {extracting && (
          <div style={{ marginBottom: 10, textAlign: 'center' }}>
            <Spin size="small" /> <span style={{ fontSize: 12, color: '#9a8e7a', marginLeft: 8 }}>正在提取文件内容...</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <Tooltip title="上传图片/PDF/Word">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={extracting}
              style={{
                width: 42,
                height: 42,
                borderRadius: 8,
                flexShrink: 0,
                border: '1px solid rgba(0,0,0,.12)',
                backgroundColor: '#f9f7f5',
                cursor: extracting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#5a4e3a',
                fontSize: 18,
                transition: 'all 0.15s',
                outline: 'none',
              }}
              onMouseEnter={(event) => {
                if (!extracting) {
                  event.currentTarget.style.borderColor = '#E87545'
                  event.currentTarget.style.color = '#E87545'
                }
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.borderColor = 'rgba(0,0,0,.12)'
                event.currentTarget.style.color = '#5a4e3a'
              }}
            >
              <CameraOutlined />
            </button>
          </Tooltip>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            style={{ display: 'none' }}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleFile(file)
              event.target.value = ''
            }}
          />

          <TextArea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void sendMessage()
              }
            }}
            placeholder={attachment ? `针对「${attachment.name}」提问，或直接发送...` : '输入题目或问题... (Enter发送)'}
            autoSize={{ minRows: 1, maxRows: 6 }}
            style={{ flex: 1, resize: 'none', borderRadius: 8, fontSize: 14 }}
            disabled={loading}
          />

          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={(!input.trim() && !attachment) || loading}
            style={{
              width: 42,
              height: 42,
              borderRadius: 8,
              flexShrink: 0,
              border: 'none',
              cursor: (!input.trim() && !attachment) || loading ? 'not-allowed' : 'pointer',
              backgroundColor: (!input.trim() && !attachment) || loading ? '#e0d8d0' : '#E87545',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              transition: 'all 0.2s',
              outline: 'none',
            }}
          >
            {loading ? <LoadingOutlined /> : <SendOutlined />}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: '#c0b8ae' }}>
            图片拍照解题 · PDF试卷 · Word文档 · Enter发送
          </span>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => updateCurrentConversation(() => [])}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                color: '#c0b8ae',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <ClearOutlined /> 清空当前模型对话
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes ai-file-blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  )
}
