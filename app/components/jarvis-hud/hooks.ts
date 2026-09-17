'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SpeechAlignment } from '@/lib/jarvisClient'

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches)
    const handler = () => setReduced(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

export interface AudioBands { low: number; mid: number; high: number }

function smooth(prev: number, next: number, factor: number) {
  return prev + (next - prev) * factor
}

// Mic input, only ever started from an explicit click (never on mount) -
// the caller is responsible for surfacing a visible "mic is on" indicator.
export function useMicVolume() {
  const [listening, setListening] = useState(false)
  const [level, setLevel] = useState(0)
  const streamRef = useRef<MediaStream | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    ctxRef.current?.close().catch(() => {})
    ctxRef.current = null
    setListening(false)
    setLevel(0)
  }, [])

  const start = useCallback(async (onResult?: (transcript: string) => void) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioCtx()
      ctxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      let smoothed = 0

      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let sumSquares = 0
        for (let i = 0; i < data.length; i++) {
          const centered = (data[i] - 128) / 128
          sumSquares += centered * centered
        }
        const rms = Math.sqrt(sumSquares / data.length)
        smoothed = smooth(smoothed, Math.min(1, rms * 3.2), 0.35)
        setLevel(smoothed)
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
      setListening(true)

      // Speech-to-text: the Web Speech API (if present) runs alongside the
      // raw analyser above - the analyser drives the visual pulse, this
      // drives the actual transcript.
      const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }
      const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
      if (Ctor && onResult) {
        const recognition = new Ctor()
        recognition.lang = 'da-DK'
        recognition.interimResults = false
        recognition.maxAlternatives = 1
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript
          onResult(transcript)
        }
        recognition.onend = () => stop()
        recognition.onerror = () => stop()
        recognition.start()
      }
    } catch (e) {
      console.error('useMicVolume: getUserMedia failed -', e)
      stop()
    }
  }, [stop])

  useEffect(() => () => stop(), [stop])

  return { listening, level, start, stop }
}

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

// Drives the hexagon core's "speaking" visualization. Real mode decodes
// ElevenLabs' base64 mp3 through the Web Audio API and analyses actual
// frequency bands while it plays; demo mode (browser speechSynthesis) has
// no analysable audio graph, so it pulses on word boundaries instead - see
// task brief, section 4.
export function useJarvisVoice() {
  const [speaking, setSpeaking] = useState(false)
  const [level, setLevel] = useState(0)
  const [bands, setBands] = useState<AudioBands>({ low: 0, mid: 0, high: 0 })
  const ctxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)

  const stopAll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    try { sourceRef.current?.stop() } catch { /* already stopped */ }
    sourceRef.current = null
    try { window.speechSynthesis?.cancel() } catch { /* unsupported */ }
    setSpeaking(false)
    setLevel(0)
    setBands({ low: 0, mid: 0, high: 0 })
  }, [])

  const speakReal = useCallback(async (audioBase64: string, _alignment?: SpeechAlignment | null): Promise<void> => {
    void _alignment // reserved: word-level alignment is available for a future finer-grained pulse map; frequency analysis below already drives per-syllable-scale motion
    return new Promise((resolve) => {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const ctx = new AudioCtx()
        ctxRef.current = ctx
        const binary = atob(audioBase64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

        ctx.decodeAudioData(bytes.buffer.slice(0), (buffer) => {
          const source = ctx.createBufferSource()
          source.buffer = buffer
          sourceRef.current = source
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 1024
          source.connect(analyser)
          analyser.connect(ctx.destination)
          const freqData = new Uint8Array(analyser.frequencyBinCount)
          let smoothedLevel = 0
          let smoothedLow = 0
          let smoothedMid = 0
          let smoothedHigh = 0

          const binsPerBand = Math.floor(freqData.length / 3)

          const tick = () => {
            analyser.getByteFrequencyData(freqData)
            let low = 0, mid = 0, high = 0
            for (let i = 0; i < binsPerBand; i++) low += freqData[i]
            for (let i = binsPerBand; i < binsPerBand * 2; i++) mid += freqData[i]
            for (let i = binsPerBand * 2; i < freqData.length; i++) high += freqData[i]
            low = low / binsPerBand / 255
            mid = mid / binsPerBand / 255
            high = high / (freqData.length - binsPerBand * 2) / 255
            const overall = (low + mid + high) / 3

            smoothedLevel = smooth(smoothedLevel, overall, 0.3)
            smoothedLow = smooth(smoothedLow, low, 0.3)
            smoothedMid = smooth(smoothedMid, mid, 0.3)
            smoothedHigh = smooth(smoothedHigh, high, 0.3)
            setLevel(smoothedLevel)
            setBands({ low: smoothedLow, mid: smoothedMid, high: smoothedHigh })
            rafRef.current = requestAnimationFrame(tick)
          }
          source.onended = () => {
            stopAll()
            ctx.close().catch(() => {})
            resolve()
          }
          setSpeaking(true)
          source.start()
          tick()
        }, (err) => {
          console.error('useJarvisVoice: decodeAudioData failed -', err)
          resolve()
        })
      } catch (e) {
        console.error('useJarvisVoice: speakReal failed -', e)
        resolve()
      }
    })
  }, [stopAll])

  const speakDemo = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'da-DK'
        setSpeaking(true)
        // No analysable audio graph for system TTS - pulse on each word
        // boundary instead, with a quick decay so it reads as a syllable
        // flicker rather than a step function.
        let pulse = 0
        const decayInterval = setInterval(() => {
          pulse = Math.max(0, pulse - 0.08)
          setLevel(pulse)
          setBands({ low: pulse * 0.8, mid: pulse, high: pulse * 0.6 })
        }, 40)
        utterance.onboundary = () => { pulse = 1 }
        utterance.onend = () => {
          clearInterval(decayInterval)
          stopAll()
          resolve()
        }
        utterance.onerror = () => {
          clearInterval(decayInterval)
          stopAll()
          resolve()
        }
        window.speechSynthesis.speak(utterance)
      } catch (e) {
        console.error('useJarvisVoice: speakDemo failed -', e)
        resolve()
      }
    })
  }, [stopAll])

  useEffect(() => () => stopAll(), [stopAll])

  return { speaking, level, bands, speakReal, speakDemo, stop: stopAll }
}
