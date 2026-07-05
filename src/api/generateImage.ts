import type { GenerateImageResponse, ImageSize } from '../types'

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return undefined
}

function extractErrorMessage(json: unknown): string | undefined {
  if (!json || typeof json !== 'object') return
  const o = json as Record<string, unknown>
  for (const key of ['message', 'error', 'msg', 'detail']) {
    const value = o[key]
    if (typeof value === 'string' && value.length > 0) return value
    if (value && typeof value === 'object') {
      const nested = value as Record<string, unknown>
      if (typeof nested.message === 'string' && nested.message.length > 0) {
        return nested.message
      }
    }
  }
}

async function parseImageFromResponse(json: unknown): Promise<string> {
  if (!json || typeof json !== 'object') {
    throw new Error('响应体不是 JSON 对象')
  }
  const root = json as Record<string, unknown>

  const direct =
    pickString(root, ['b64_json', 'image_base64']) ??
    (typeof root.image === 'string' ? root.image : undefined)
  if (direct) {
    if (direct.startsWith('data:')) return direct
    return `data:image/png;base64,${direct}`
  }

  const dataArr = root.data
  if (Array.isArray(dataArr) && dataArr.length > 0) {
    const first = dataArr[0]
    if (first && typeof first === 'object') {
      const item = first as Record<string, unknown>
      if (typeof item.url === 'string') return item.url
      if (typeof item.b64_json === 'string') {
        const b64 = item.b64_json
        return b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`
      }
    }
  }

  throw new Error('未返回图片数据')
}

export async function generateImage(
  baseUrl: string,
  apiKey: string,
  prompt: string,
  size: ImageSize,
  signal?: AbortSignal,
): Promise<string> {
  const base = baseUrl.replace(/\/$/, '')
  const url = `${base}/v1/images/generations`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt,
      size,
    }),
    signal,
  })

  const text = await response.text()

  let data: GenerateImageResponse
  try {
    data = text ? (JSON.parse(text) as GenerateImageResponse) : {}
  } catch {
    throw new Error(`响应不是合法 JSON（HTTP ${response.status}）：${text.slice(0, 280)}`)
  }

  if (!response.ok) {
    throw new Error(extractErrorMessage(data) || text.slice(0, 400) || `请求失败 (${response.status})`)
  }

  return parseImageFromResponse(data)
}
