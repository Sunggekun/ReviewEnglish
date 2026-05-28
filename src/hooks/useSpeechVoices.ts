import { useSyncExternalStore } from 'react'
import {
  getSpeechVoices,
  sortVoices,
} from '../services/speechVoices'

const EMPTY_VOICES: SpeechSynthesisVoice[] = []

let cachedVoices: SpeechSynthesisVoice[] = EMPTY_VOICES
let cachedKey = ''

function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function voicesCacheKey(voices: SpeechSynthesisVoice[]): string {
  return voices.map((v) => v.voiceURI).join('\0')
}

function subscribeVoicesChanged(callback: () => void): () => void {
  if (!speechSupported()) return () => {}
  const synth = window.speechSynthesis
  synth.addEventListener('voiceschanged', callback)
  synth.getVoices()
  return () => synth.removeEventListener('voiceschanged', callback)
}

function getVoicesSnapshot(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return EMPTY_VOICES
  const raw = getSpeechVoices()
  const key = voicesCacheKey(raw)
  if (key === cachedKey) return cachedVoices
  cachedKey = key
  cachedVoices = key === '' ? EMPTY_VOICES : sortVoices(raw)
  return cachedVoices
}

function getVoicesServerSnapshot(): SpeechSynthesisVoice[] {
  return EMPTY_VOICES
}

export function useSpeechVoices(): {
  voices: SpeechSynthesisVoice[]
  supported: boolean
} {
  const voices = useSyncExternalStore(
    subscribeVoicesChanged,
    getVoicesSnapshot,
    getVoicesServerSnapshot,
  )
  return { voices, supported: speechSupported() }
}
