export type AudioCue = 'hover' | 'click' | 'open' | 'transition' | 'boot'

let audioContext: AudioContext | null = null
let enabled = false

const cueFrequency: Record<AudioCue, number> = {
  hover: 520,
  click: 760,
  open: 420,
  transition: 180,
  boot: 96,
}

export const setAudioFeedbackEnabled = (value: boolean) => {
  enabled = value
  if (enabled && !audioContext) {
    audioContext = new AudioContext()
  }
}

export const playAudioCue = (cue: AudioCue) => {
  if (!enabled || !audioContext) return
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()
  oscillator.type = cue === 'transition' || cue === 'boot' ? 'sawtooth' : 'sine'
  oscillator.frequency.value = cueFrequency[cue]
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.035, audioContext.currentTime + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.12)
  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start()
  oscillator.stop(audioContext.currentTime + 0.13)
}
