import type { AspectRatio, ImageSize } from '../types'

export const DEFAULT_API_BASE = 'https://ai.t8star.org'

export const DEFAULT_MODEL = 'gpt-image-2'

/** OpenAPI 常用：2K 横屏 16:9 */
export const SIZE_LANDSCAPE = '2048x1152' as const

/** OpenAPI 常用：4K 竖屏 9:16 */
export const SIZE_PORTRAIT = '2160x3840' as const

export const DEFAULT_ASPECT_RATIO: AspectRatio = '9:16'

export const DEFAULT_QUALITY = 'auto' as const

export const DEFAULT_LANDSCAPE_COMPOSE_PROMPT =
  '【画面比例】横版宽屏 16:9 landscape orientation，画布横向（宽明显大于高），宽银幕电影构图，人物与场景按横向布局，禁止竖版 portrait 布局。'

export const DEFAULT_PORTRAIT_COMPOSE_PROMPT =
  '【画面比例】竖版 9:16 portrait orientation，画布纵向（高明显大于宽），竖屏构图，禁止横版 landscape 布局。'

export const QUALITY_OPTIONS: { value: 'auto' | 'low' | 'medium' | 'high'; label: string }[] = [
  { value: 'auto', label: '自动' },
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
]

export function aspectToApiSize(aspect: AspectRatio): ImageSize {
  return aspect === '16:9' ? SIZE_LANDSCAPE : SIZE_PORTRAIT
}

export function formatGenerationMeta(aspect: AspectRatio, quality: string): string {
  return `${aspect} · ${aspectToApiSize(aspect)} · ${quality}`
}

export function isLandscapeAspect(aspect: AspectRatio): boolean {
  return aspect === '16:9'
}
