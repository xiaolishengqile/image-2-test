import type { AspectRatio, ImageSize } from '../types'

export const DEFAULT_API_BASE = 'https://ai.t8star.org'

export const DEFAULT_MODEL = 'gpt-image-2'

/** 2K 竖屏 9:16（与 Batch_image_splitting 一致） */
export const SIZE_2K_PORTRAIT = '2048x3584' as const

/** 2K 横屏 16:9（与 Batch_image_splitting 一致） */
export const SIZE_2K_LANDSCAPE = '3584x2048' as const

export const DEFAULT_ASPECT_RATIO = '9:16' as const

export const DEFAULT_QUALITY = 'high' as const

export const QUALITY_LABEL = '2K'

export function aspectToSize(aspect: AspectRatio): ImageSize {
  return aspect === '16:9' ? SIZE_2K_LANDSCAPE : SIZE_2K_PORTRAIT
}

export function formatGenerationMeta(aspect: AspectRatio): string {
  return `${aspect} · ${QUALITY_LABEL}`
}
