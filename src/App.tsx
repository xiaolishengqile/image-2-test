import { useCallback, useEffect, useRef, useState } from 'react'
import { generateImage } from './api/generateImage'
import {
  DEFAULT_API_BASE,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_QUALITY,
  QUALITY_OPTIONS,
  aspectToApiSize,
  formatGenerationMeta,
  isLandscapeAspect,
} from './lib/constants'
import {
  DEFAULT_LANDSCAPE_COMPOSE_PROMPT,
  DEFAULT_PORTRAIT_COMPOSE_PROMPT,
  buildFinalPrompt,
} from './lib/prompt'
import { copyImageToClipboard } from './utils/copyImage'
import type { AspectRatio, ChatMessage, GenerateSettings, ImageQuality } from './types'

const STORAGE_KEY = 'image2-settings'

function loadSettings(): GenerateSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GenerateSettings> & { size?: string }
      let apiBase = parsed.apiBase ?? DEFAULT_API_BASE
      if (apiBase.includes('ai.t8star.cn')) {
        apiBase = apiBase.replace('ai.t8star.cn', 'ai.t8star.org')
      }
      let aspectRatio: AspectRatio = parsed.aspectRatio ?? DEFAULT_ASPECT_RATIO
      if (!parsed.aspectRatio && parsed.size === '2048x1152') {
        aspectRatio = '16:9'
      }
      return {
        apiKey: parsed.apiKey ?? '',
        apiBase,
        aspectRatio,
        quality: parsed.quality ?? DEFAULT_QUALITY,
        enableComposePrompt: parsed.enableComposePrompt ?? true,
        landscapeComposePrompt:
          parsed.landscapeComposePrompt ?? DEFAULT_LANDSCAPE_COMPOSE_PROMPT,
        portraitComposePrompt:
          parsed.portraitComposePrompt ?? DEFAULT_PORTRAIT_COMPOSE_PROMPT,
      }
    }
  } catch {
    /* ignore */
  }
  return {
    apiKey: '',
    apiBase: DEFAULT_API_BASE,
    aspectRatio: DEFAULT_ASPECT_RATIO,
    quality: DEFAULT_QUALITY,
    enableComposePrompt: true,
    landscapeComposePrompt: DEFAULT_LANDSCAPE_COMPOSE_PROMPT,
    portraitComposePrompt: DEFAULT_PORTRAIT_COMPOSE_PROMPT,
  }
}

function saveSettings(settings: GenerateSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

function createId() {
  return crypto.randomUUID()
}

export default function App() {
  const [settings, setSettings] = useState<GenerateSettings>(loadSettings)
  const [showKey, setShowKey] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [showSettings, setShowSettings] = useState(() => !loadSettings().apiKey)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortMap = useRef(new Map<string, AbortController>())
  const settingsRef = useRef(settings)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!preview) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreview(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [preview])

  const runGeneration = useCallback(async (message: ChatMessage, apiKey: string, apiBase: string) => {
    const controller = new AbortController()
    abortMap.current.set(message.id, controller)

    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? { ...m, status: 'loading' as const } : m)),
    )

    const finalPrompt = buildFinalPrompt(message.prompt, message.aspectRatio, settingsRef.current)

    try {
      const imageUrl = await generateImage(
        apiBase,
        apiKey,
        finalPrompt,
        message.size,
        message.quality,
        controller.signal,
      )
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id ? { ...m, status: 'success' as const, imageUrl } : m,
        ),
      )
    } catch (err) {
      if (controller.signal.aborted) return
      const error = err instanceof Error ? err.message : '生成失败'
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id ? { ...m, status: 'error' as const, error } : m,
        ),
      )
    } finally {
      abortMap.current.delete(message.id)
    }
  }, [])

  const handleSend = () => {
    const trimmed = prompt.trim()
    if (!trimmed) return

    const apiKey = settings.apiKey.trim()
    const apiBase = settings.apiBase.trim()

    if (!apiKey || !apiBase) {
      setShowSettings(true)
      return
    }

    const message: ChatMessage = {
      id: createId(),
      prompt: trimmed,
      aspectRatio: settings.aspectRatio,
      size: aspectToApiSize(settings.aspectRatio),
      quality: settings.quality,
      status: 'pending',
      createdAt: Date.now(),
    }

    setMessages((prev) => [...prev, message])
    setPrompt('')
    void runGeneration(message, apiKey, apiBase)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleRetry = (message: ChatMessage) => {
    const apiKey = settings.apiKey.trim()
    const apiBase = settings.apiBase.trim()
    if (!apiKey || !apiBase) {
      setShowSettings(true)
      return
    }
    setMessages((prev) =>
      prev.map((m) =>
        m.id === message.id
          ? { ...m, status: 'pending' as const, error: undefined, imageUrl: undefined }
          : m,
      ),
    )
    void runGeneration(message, apiKey, apiBase)
  }

  const handleCancel = (id: string) => {
    abortMap.current.get(id)?.abort()
    abortMap.current.delete(id)
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }

  const handleClear = () => {
    abortMap.current.forEach((c) => c.abort())
    abortMap.current.clear()
    setMessages([])
  }

  const handleCopy = async (id: string, imageUrl: string) => {
    try {
      await copyImageToClipboard(imageUrl)
      setCopiedId(id)
      setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 2000)
    } catch {
      window.alert('复制失败，请尝试右键保存图片')
    }
  }

  const pendingCount = messages.filter(
    (m) => m.status === 'pending' || m.status === 'loading',
  ).length

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="logo" aria-hidden>🎨</div>
          <div className="header-title">
            <h1>Image-2 生图</h1>
            <p>gpt-image-2 · 贞贞的AI工坊</p>
          </div>
        </div>
        <div className="header-actions">
          {pendingCount > 0 && (
            <span className="pending-badge">{pendingCount} 张生成中</span>
          )}
          <button
            type="button"
            className={`btn-ghost${showSettings ? ' active' : ''}`}
            onClick={() => setShowSettings((v) => !v)}
          >
            设置
          </button>
          {messages.length > 0 && (
            <button type="button" className="btn-ghost" onClick={handleClear}>
              清空
            </button>
          )}
        </div>
      </header>

      {showSettings && (
        <section className="settings-panel">
          <div className="settings-panel-title">连接设置</div>
          <label className="field">
            <span>API Key</span>
            <div className="key-row">
              <input
                type={showKey ? 'text' : 'password'}
                value={settings.apiKey}
                onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
                placeholder="sk-..."
                autoComplete="off"
              />
              <button type="button" className="btn-ghost" onClick={() => setShowKey((v) => !v)}>
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
            <small>密钥仅保存在浏览器本地，不会上传到任何服务器</small>
          </label>

          <label className="field">
            <span>接口地址</span>
            <input
              type="url"
              value={settings.apiBase}
              onChange={(e) => setSettings((s) => ({ ...s, apiBase: e.target.value }))}
              placeholder="https://ai.t8star.org"
            />
            <small>浏览器直连中转站，无需额外代理</small>
          </label>

          <div className="settings-panel-title">构图提示词（自动拼接到每次请求）</div>
          <label className="field checkbox-field">
            <input
              type="checkbox"
              checked={settings.enableComposePrompt}
              onChange={(e) =>
                setSettings((s) => ({ ...s, enableComposePrompt: e.target.checked }))
              }
            />
            <span>启用默认构图提示词</span>
          </label>

          <label className="field">
            <span>横屏 16:9 构图提示</span>
            <textarea
              className="compose-textarea"
              value={settings.landscapeComposePrompt}
              onChange={(e) =>
                setSettings((s) => ({ ...s, landscapeComposePrompt: e.target.value }))
              }
              rows={3}
              disabled={!settings.enableComposePrompt}
            />
          </label>

          <label className="field">
            <span>竖屏 9:16 构图提示</span>
            <textarea
              className="compose-textarea"
              value={settings.portraitComposePrompt}
              onChange={(e) =>
                setSettings((s) => ({ ...s, portraitComposePrompt: e.target.value }))
              }
              rows={3}
              disabled={!settings.enableComposePrompt}
            />
          </label>

          <div className="settings-actions">
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  landscapeComposePrompt: DEFAULT_LANDSCAPE_COMPOSE_PROMPT,
                  portraitComposePrompt: DEFAULT_PORTRAIT_COMPOSE_PROMPT,
                }))
              }
            >
              恢复默认构图提示
            </button>
          </div>
        </section>
      )}

      <main className="chat">
        {messages.length === 0 ? (
          <div className="empty">
            <div className="empty-icon" aria-hidden>✨</div>
            <p className="empty-title">开始创作你的图片</p>
            <p className="hint">
              在下方输入提示词并发送。生成过程中可以继续输入，多张图片会并行生成。
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <article key={msg.id} className="message-group">
              <div className="bubble user-bubble">
                <p>{msg.prompt}</p>
                <span className="meta">{formatGenerationMeta(msg.aspectRatio, msg.quality)}</span>
              </div>

              <div className="bubble ai-bubble">
                {(msg.status === 'pending' || msg.status === 'loading') && (
                  <div className="loading">
                    <div className="spinner" />
                    <span>{msg.status === 'pending' ? '排队中…' : '生成中…'}</span>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => handleCancel(msg.id)}>
                      取消
                    </button>
                  </div>
                )}

                {msg.status === 'error' && (
                  <div className="error">
                    <p>{msg.error}</p>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => handleRetry(msg)}>
                      重试
                    </button>
                  </div>
                )}

                {msg.status === 'success' && msg.imageUrl && (
                  <div className={`image-result${isLandscapeAspect(msg.aspectRatio) ? ' landscape' : ' portrait'}`}>
                    <button
                      type="button"
                      className="image-preview-trigger"
                      onClick={() => setPreview({ src: msg.imageUrl!, alt: msg.prompt })}
                      aria-label="放大查看图片"
                    >
                      <img src={msg.imageUrl} alt={msg.prompt} />
                      <span className="image-preview-hint">点击放大</span>
                    </button>
                    <div className="image-actions">
                      <a href={msg.imageUrl} download={`image-${msg.id}.png`}>
                        下载
                      </a>
                      <button
                        type="button"
                        className="btn-action"
                        onClick={() => void handleCopy(msg.id, msg.imageUrl!)}
                      >
                        {copiedId === msg.id ? '已复制' : '复制'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))
        )}
        <div ref={bottomRef} />
      </main>

      <footer className="input-area">
        <div className="input-toolbar">
          <span className="toolbar-label">比例</span>
          <button
            type="button"
            className={`btn-aspect${settings.aspectRatio === '9:16' ? ' active' : ''}`}
            onClick={() => setSettings((s) => ({ ...s, aspectRatio: '9:16' }))}
          >
            9:16
          </button>
          <button
            type="button"
            className={`btn-aspect${settings.aspectRatio === '16:9' ? ' active' : ''}`}
            onClick={() => setSettings((s) => ({ ...s, aspectRatio: '16:9' }))}
          >
            16:9
          </button>
          <span className="toolbar-label">质量</span>
          <select
            className="toolbar-select"
            value={settings.quality}
            onChange={(e) =>
              setSettings((s) => ({ ...s, quality: e.target.value as ImageQuality }))
            }
          >
            {QUALITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="toolbar-hint">{aspectToApiSize(settings.aspectRatio)}</span>
        </div>
        <div className="input-row">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="描述你想生成的图片…（Enter 发送，Shift+Enter 换行）"
            rows={2}
          />
          <button type="button" className="btn-send" onClick={handleSend} disabled={!prompt.trim()}>
            发送
          </button>
        </div>
      </footer>

      {preview && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="图片预览"
          onClick={() => setPreview(null)}
        >
          <button type="button" className="lightbox-close" onClick={() => setPreview(null)} aria-label="关闭">
            ×
          </button>
          <img
            className="lightbox-image"
            src={preview.src}
            alt={preview.alt}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
