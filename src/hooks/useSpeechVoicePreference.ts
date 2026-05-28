import { useMemo, useState } from 'react'
import { resolveVoiceByURI } from '../services/speechVoices'
import {
  loadSpeechVoiceURI,
  saveSpeechVoiceURI,
} from '../storage/speechVoicePreference'

export function useSpeechVoicePreference(): {
  voiceURI: string
  selectedVoice: SpeechSynthesisVoice | undefined
  setVoiceURI: (uri: string) => void
} {
  const [voiceURI, setVoiceURIState] = useState(loadSpeechVoiceURI)

  const selectedVoice = useMemo(
    () => (voiceURI.trim() ? resolveVoiceByURI(voiceURI) : undefined),
    [voiceURI],
  )

  const setVoiceURI = (uri: string) => {
    saveSpeechVoiceURI(uri)
    setVoiceURIState(uri)
  }

  return { voiceURI, selectedVoice, setVoiceURI }
}
