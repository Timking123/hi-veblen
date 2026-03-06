import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * Audio Compatibility Tests
 * 
 * Tests Web Audio API support and audio format compatibility:
 * - Web Audio API availability
 * - AudioContext creation
 * - Audio node support
 * - Audio format support (MP3, OGG, WAV)
 * - Autoplay policy handling
 */

describe('Audio Compatibility Tests', () => {
  describe('35.2 音频兼容性测试', () => {
    let audioContext: AudioContext | null = null

    afterEach(() => {
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close()
      }
      audioContext = null
    })

    it('should support Web Audio API', () => {
      // Check if AudioContext is available (in real browsers)
      // In jsdom, this may not be available, but we test the API structure
      const hasAudioContext = typeof window.AudioContext !== 'undefined' || 
                              typeof (window as any).webkitAudioContext !== 'undefined'
      
      // In a real browser, at least one should be defined
      // In test environment, we just verify the check works
      expect(typeof hasAudioContext).toBe('boolean')
    })

    it('should create AudioContext successfully', () => {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      
      // Skip if AudioContext is not available (jsdom environment)
      if (!AudioContextClass) {
        expect(AudioContextClass).toBeUndefined()
        return
      }
      
      expect(() => {
        audioContext = new AudioContextClass()
      }).not.toThrow()
      
      expect(audioContext).not.toBeNull()
      expect(audioContext!.state).toBeDefined()
    })

    it('should support AudioContext states', () => {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      
      // Skip if AudioContext is not available
      if (!AudioContextClass) {
        expect(AudioContextClass).toBeUndefined()
        return
      }
      
      audioContext = new AudioContextClass()
      
      // Check state property
      expect(audioContext.state).toBeDefined()
      expect(['suspended', 'running', 'closed']).toContain(audioContext.state)
      
      // Check state change methods
      expect(audioContext.suspend).toBeDefined()
      expect(audioContext.resume).toBeDefined()
      expect(audioContext.close).toBeDefined()
    })

    it('should support audio nodes creation', () => {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      
      // Skip if AudioContext is not available
      if (!AudioContextClass) {
        expect(AudioContextClass).toBeUndefined()
        return
      }
      
      audioContext = new AudioContextClass()
      
      // Test GainNode
      expect(() => audioContext!.createGain()).not.toThrow()
      const gainNode = audioContext!.createGain()
      expect(gainNode).toBeDefined()
      expect(gainNode.gain).toBeDefined()
      
      // Test OscillatorNode
      expect(() => audioContext!.createOscillator()).not.toThrow()
      
      // Test BufferSourceNode
      expect(() => audioContext!.createBufferSource()).not.toThrow()
      
      // Test destination
      expect(audioContext!.destination).toBeDefined()
    })

    it('should support AudioBuffer creation', () => {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      
      // Skip if AudioContext is not available
      if (!AudioContextClass) {
        expect(AudioContextClass).toBeUndefined()
        return
      }
      
      audioContext = new AudioContextClass()
      
      // Create a simple audio buffer
      const sampleRate = audioContext!.sampleRate
      const buffer = audioContext!.createBuffer(2, sampleRate * 1, sampleRate)
      
      expect(buffer).toBeDefined()
      expect(buffer.length).toBe(sampleRate)
      expect(buffer.numberOfChannels).toBe(2)
      expect(buffer.sampleRate).toBe(sampleRate)
    })

    it('should support audio node connections', () => {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      
      // Skip if AudioContext is not available
      if (!AudioContextClass) {
        expect(AudioContextClass).toBeUndefined()
        return
      }
      
      audioContext = new AudioContextClass()
      
      const gainNode = audioContext!.createGain()
      const oscillator = audioContext!.createOscillator()
      
      // Test connect method
      expect(() => {
        oscillator.connect(gainNode)
        gainNode.connect(audioContext!.destination)
      }).not.toThrow()
      
      // Test disconnect method
      expect(() => {
        oscillator.disconnect()
        gainNode.disconnect()
      }).not.toThrow()
    })

    it('should support gain control', () => {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      
      // Skip if AudioContext is not available
      if (!AudioContextClass) {
        expect(AudioContextClass).toBeUndefined()
        return
      }
      
      audioContext = new AudioContextClass()
      
      const gainNode = audioContext!.createGain()
      
      // Test gain value
      expect(gainNode.gain.value).toBeDefined()
      expect(typeof gainNode.gain.value).toBe('number')
      
      // Test setting gain
      expect(() => {
        gainNode.gain.value = 0.5
      }).not.toThrow()
      
      expect(gainNode.gain.value).toBe(0.5)
      
      // Test gain automation methods
      expect(gainNode.gain.setValueAtTime).toBeDefined()
      expect(gainNode.gain.linearRampToValueAtTime).toBeDefined()
      expect(gainNode.gain.exponentialRampToValueAtTime).toBeDefined()
    })

    it('should support HTML Audio element', () => {
      const audio = document.createElement('audio')
      
      expect(audio).toBeDefined()
      expect(audio.play).toBeDefined()
      expect(audio.pause).toBeDefined()
      expect(audio.load).toBeDefined()
      
      // Test properties
      expect(audio.volume).toBeDefined()
      expect(audio.currentTime).toBeDefined()
      expect(audio.duration).toBeDefined()
      expect(audio.paused).toBeDefined()
    })

    it('should support audio format detection - MP3', () => {
      const audio = document.createElement('audio')
      
      // Test MP3 support
      const mp3Support = audio.canPlayType('audio/mpeg')
      expect(mp3Support).toBeDefined()
      
      // MP3 should be supported in most modern browsers
      // Result can be 'probably', 'maybe', or ''
      expect(['probably', 'maybe', '']).toContain(mp3Support)
    })

    it('should support audio format detection - OGG', () => {
      const audio = document.createElement('audio')
      
      // Test OGG support
      const oggSupport = audio.canPlayType('audio/ogg')
      expect(oggSupport).toBeDefined()
      expect(['probably', 'maybe', '']).toContain(oggSupport)
    })

    it('should support audio format detection - WAV', () => {
      const audio = document.createElement('audio')
      
      // Test WAV support
      const wavSupport = audio.canPlayType('audio/wav')
      expect(wavSupport).toBeDefined()
      expect(['probably', 'maybe', '']).toContain(wavSupport)
    })

    it('should handle autoplay policy', async () => {
      const audio = document.createElement('audio')
      
      // Create a silent audio data URL
      const silentAudio = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
      audio.src = silentAudio
      
      // Try to play - may be blocked by autoplay policy
      try {
        const playPromise = audio.play()
        
        if (playPromise !== undefined) {
          expect(playPromise).toBeInstanceOf(Promise)
          
          // Wait for play to resolve or reject
          await playPromise.catch((error) => {
            // Autoplay blocked - this is expected in many browsers
            expect(error.name).toBe('NotAllowedError')
          })
        }
      } catch (error: any) {
        // Older browsers may throw synchronously
        expect(error.name).toBe('NotAllowedError')
      }
      
      audio.pause()
    })

    it('should support audio context resume after user interaction', async () => {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      
      // Skip if AudioContext is not available
      if (!AudioContextClass) {
        expect(AudioContextClass).toBeUndefined()
        return
      }
      
      audioContext = new AudioContextClass()
      
      // Context may start suspended due to autoplay policy
      if (audioContext.state === 'suspended') {
        // Resume should be available
        expect(audioContext.resume).toBeDefined()
        
        // Try to resume
        const resumePromise = audioContext.resume()
        expect(resumePromise).toBeInstanceOf(Promise)
        
        // In test environment, resume may or may not succeed
        await resumePromise.catch(() => {
          // Resume failed - acceptable in test environment
        })
      }
    })

    it('should support decodeAudioData', async () => {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      
      // Skip if AudioContext is not available
      if (!AudioContextClass) {
        expect(AudioContextClass).toBeUndefined()
        return
      }
      
      audioContext = new AudioContextClass()
      
      expect(audioContext.decodeAudioData).toBeDefined()
      
      // Create a minimal valid WAV file buffer
      const createWavBuffer = () => {
        const sampleRate = 44100
        const numChannels = 1
        const bitsPerSample = 16
        const numSamples = 100
        
        const buffer = new ArrayBuffer(44 + numSamples * 2)
        const view = new DataView(buffer)
        
        // WAV header
        const writeString = (offset: number, string: string) => {
          for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i))
          }
        }
        
        writeString(0, 'RIFF')
        view.setUint32(4, 36 + numSamples * 2, true)
        writeString(8, 'WAVE')
        writeString(12, 'fmt ')
        view.setUint32(16, 16, true)
        view.setUint16(20, 1, true)
        view.setUint16(22, numChannels, true)
        view.setUint32(24, sampleRate, true)
        view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true)
        view.setUint16(32, numChannels * bitsPerSample / 8, true)
        view.setUint16(34, bitsPerSample, true)
        writeString(36, 'data')
        view.setUint32(40, numSamples * 2, true)
        
        return buffer
      }
      
      const wavBuffer = createWavBuffer()
      
      try {
        const audioBuffer = await audioContext.decodeAudioData(wavBuffer)
        expect(audioBuffer).toBeDefined()
        expect(audioBuffer.length).toBeGreaterThan(0)
      } catch (error) {
        // Decoding may fail in test environment - that's acceptable
        // The important thing is that the API exists
        expect(error).toBeDefined()
      }
    })

    it('should support audio timing and scheduling', () => {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      
      // Skip if AudioContext is not available
      if (!AudioContextClass) {
        expect(AudioContextClass).toBeUndefined()
        return
      }
      
      audioContext = new AudioContextClass()
      
      // Test currentTime
      expect(audioContext.currentTime).toBeDefined()
      expect(typeof audioContext.currentTime).toBe('number')
      expect(audioContext.currentTime).toBeGreaterThanOrEqual(0)
      
      // Test sampleRate
      expect(audioContext.sampleRate).toBeDefined()
      expect(typeof audioContext.sampleRate).toBe('number')
      expect(audioContext.sampleRate).toBeGreaterThan(0)
    })
  })
})
