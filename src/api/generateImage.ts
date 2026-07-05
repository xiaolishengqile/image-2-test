import type { GenerateImageResponse, ImageQuality, ImageSize } from '../types'

const API_BASE = '/api/v1/images/generations'

export async function generateImage(
  apiKey: string,
  prompt: string,
  size: ImageSize,
  quality: ImageQuality,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(API_BASE, {
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

  const data = (await response.json()) as GenerateImageResponse

  if (!response.ok) {
    throw new Error(data.error?.message || `请求失败 (${response.status})`)
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
