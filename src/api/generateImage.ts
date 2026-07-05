import type { GenerateImageResponse, ImageQuality, ImageSize } from '../types'

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

export async function generateImage(
  baseUrl: string,
  apiKey: string,
  prompt: string,
  size: ImageSize,
  quality: ImageQuality,
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
      quality,
      response_format: 'b64_json',
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

  const item = data.data?.[0]
  if (item?.b64_json) {
    const raw = item.b64_json.startsWith('data:')
      ? item.b64_json
      : `data:image/png;base64,${item.b64_json}`
    return raw
  }

  if (item?.url) {
    return item.url
  }

  throw new Error('未返回图片数据')
}
