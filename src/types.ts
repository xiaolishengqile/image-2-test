export type ImageSize =
  | 'auto'
  | '1024x1024'
  | '1536x1024'
  | '1024x1536'
  | '2048x2048'
  | '2048x1152'
  | '3840x2160'
  | '2160x3840'

export type ImageQuality = 'auto' | 'low' | 'medium' | 'high'

export type MessageStatus = 'pending' | 'loading' | 'success' | 'error'

export interface ChatMessage {
  id: string
  prompt: string
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
  size: ImageSize
  quality: ImageQuality
}

export interface GenerateImageResponse {
  created?: number
  data?: Array<{ b64_json?: string; url?: string }>
  error?: { message?: string }
}
