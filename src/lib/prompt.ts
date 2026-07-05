import type { AspectRatio, GenerateSettings } from '../types'
import {
  DEFAULT_LANDSCAPE_COMPOSE_PROMPT,
  DEFAULT_PORTRAIT_COMPOSE_PROMPT,
} from './constants'

export function buildFinalPrompt(
  userPrompt: string,
  aspect: AspectRatio,
  settings: Pick<
    GenerateSettings,
    'enableComposePrompt' | 'landscapeComposePrompt' | 'portraitComposePrompt'
  >,
): string {
  const trimmed = userPrompt.trim()
  if (!settings.enableComposePrompt) return trimmed

  const suffix =
    aspect === '16:9'
      ? settings.landscapeComposePrompt.trim()
      : settings.portraitComposePrompt.trim()

  if (!suffix) return trimmed
  return `${trimmed}\n\n${suffix}`
}

export {
  DEFAULT_LANDSCAPE_COMPOSE_PROMPT,
  DEFAULT_PORTRAIT_COMPOSE_PROMPT,
}
