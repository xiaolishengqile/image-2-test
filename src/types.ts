export type AspectRatio = '9:16' | '16:9'

export type ImageSize = '2048x1152' | '2160x3840'

export type ImageQuality = 'auto' | 'low' | 'medium' | 'high'

export type MessageStatus = 'pending' | 'loading' | 'success' | 'error'

export interface ChatMessage {
  id: string
  prompt: string
  aspectRatio: AspectRatio
  size: ImageSize
  quality: ImageQuality
  status: MessageStatus
  imageUrl?: string
  error?: string
  createdAt: number
}

export interface GenerateSettings {
  apiKey: string
  apiBase: string
  aspectRatio: AspectRatio
  quality: ImageQuality
  enableComposePrompt: boolean
  landscapeComposePrompt: string
  portraitComposePrompt: string
}

export interface GenerateImageResponse {
  created?: number
  data?: Array<{ b64_json?: string; url?: string }>
  error?: { message?: string }
}
