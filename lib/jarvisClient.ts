// Server-side only helpers for talking to Jarvis (the Hermes-agent based
// assistant, a separate service - see ~/jarvis) and ElevenLabs. Never
// import this from a client component: JARVIS_API_KEY / ELEVENLABS_API_KEY
// must stay server-side.
//
// Demo mode: when the relevant env vars are not set, every function here
// returns realistic canned data instead of making a network call, so
// /admin/jarvis is fully testable locally with no real credentials.

export function jarvisConfigured(): boolean {
  return !!(process.env.JARVIS_API_URL && process.env.JARVIS_API_KEY)
}

// Separate from jarvisConfigured(): the trends endpoint (Del B, see
// ~/jarvis's docker/trends_server.py) runs as its own service on its own
// internal port (8643, not the chat API's 8642), so it has its own base URL
// and its own bearer key - the two are reachable independently, and one can
// be configured without the other. JARVIS_TRENDS_API_KEY should be set to
// whatever Jarvis's own API_SERVER_KEY (or dedicated JARVIS_TRENDS_API_KEY)
// is, on the Jarvis side - see MIGRATION-PLAN.md in ~/jarvis.
export function trendsConfigured(): boolean {
  return !!(process.env.JARVIS_TRENDS_URL && process.env.JARVIS_TRENDS_API_KEY)
}

export function elevenLabsConfigured(): boolean {
  return !!(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID)
}

export interface JarvisStatus {
  jarvisOnline: boolean
  jarvisResponseTimeMs: number | null
  portalOnline: true
  demo: boolean
  history: number[]
}

// Fixed-size, in-memory-per-process rolling window of recent response
// times, for the status panel's line graph. Resets on redeploy/restart -
// fine for a "how's it doing right now" panel, not a durability guarantee.
const RESPONSE_TIME_HISTORY: number[] = []
const HISTORY_LENGTH = 20

function pushHistory(ms: number) {
  RESPONSE_TIME_HISTORY.push(ms)
  if (RESPONSE_TIME_HISTORY.length > HISTORY_LENGTH) RESPONSE_TIME_HISTORY.shift()
}

function demoHistory(): number[] {
  // Realistic-looking synthetic values (150-400ms with gentle variance),
  // not a flat line - see task requirement for demo mode to look real.
  const points: number[] = []
  let last = 220
  for (let i = 0; i < HISTORY_LENGTH; i++) {
    last = Math.max(120, Math.min(420, last + (Math.random() - 0.5) * 60))
    points.push(Math.round(last))
  }
  return points
}

// Pings Jarvis's own documented healthcheck path (see ~/jarvis README,
// "Fase 2: Railway-deploy" - /health on the gateway port) rather than
// running a real, expensive chat turn just to check liveness.
export async function checkJarvisStatus(): Promise<JarvisStatus> {
  if (!jarvisConfigured()) {
    return { jarvisOnline: false, jarvisResponseTimeMs: null, portalOnline: true, demo: true, history: demoHistory() }
  }

  const url = `${process.env.JARVIS_API_URL!.replace(/\/$/, '')}/health`
  const start = Date.now()
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) })
    const elapsed = Date.now() - start
    if (!res.ok) throw new Error(`status ${res.status}`)
    pushHistory(elapsed)
    return { jarvisOnline: true, jarvisResponseTimeMs: elapsed, portalOnline: true, demo: false, history: [...RESPONSE_TIME_HISTORY] }
  } catch (e) {
    console.error('checkJarvisStatus: health check failed -', e instanceof Error ? e.message : e)
    return { jarvisOnline: false, jarvisResponseTimeMs: null, portalOnline: true, demo: false, history: [...RESPONSE_TIME_HISTORY] }
  }
}

const DEMO_REPLIES: Record<string, string> = {
  cvs: 'Skiftet til CVS-tilstand. (Demo-svar - JARVIS_API_URL/JARVIS_API_KEY er ikke sat, så dette er testdata, ikke et rigtigt Jarvis-svar.)',
  privat: 'Skiftet til privat-tilstand. (Demo-svar - ingen rigtig Jarvis-forbindelse konfigureret.)',
  nets: 'Skiftet til Nets-tilstand. Intet fra denne samtale gemmes i hukommelsen. (Demo-svar.)'
}

export async function chatWithJarvis(message: string, mode?: string): Promise<{ reply: string; demo: boolean }> {
  if (!jarvisConfigured()) {
    const trimmed = message.trim().toLowerCase()
    if (trimmed === '/cvs' || trimmed === '/privat' || trimmed === '/nets') {
      return { reply: DEMO_REPLIES[trimmed.slice(1)], demo: true }
    }
    return {
      reply: `(Demo-svar${mode ? ` i ${mode}-tilstand` : ''}) Jeg er testdata, fordi JARVIS_API_URL og JARVIS_API_KEY ikke er sat. Din besked var: "${message}"`,
      demo: true
    }
  }

  const url = `${process.env.JARVIS_API_URL!.replace(/\/$/, '')}/v1/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.JARVIS_API_KEY}`
    },
    body: JSON.stringify({
      model: 'jarvis',
      messages: [{ role: 'user', content: message }]
    }),
    // Jarvis runs a real agent turn (web search, tools, etc.) - give it
    // real time rather than the default fetch timeout.
    signal: AbortSignal.timeout(60_000)
  })

  if (!res.ok) {
    throw new Error(`Jarvis chat request failed: ${res.status}`)
  }
  const data = await res.json()
  const reply = data?.choices?.[0]?.message?.content
  if (typeof reply !== 'string') throw new Error('Jarvis chat response had no message content')
  return { reply, demo: false }
}

const DEMO_TRENDS = {
  topic: 'klubber',
  generated_at: new Date().toISOString(),
  demo: true,
  trends: [
    {
      title: 'Neon-lys walk-in intro (demo)',
      source_link: null,
      sound_or_hashtag: '#nightlifecph',
      why_it_works: 'Kort, rytmisk walk-in klip der matcher beatet - testdata, ikke et rigtigt fund.',
      usage_idea: 'Film en lignende walk-in-sekvens for en klub-kunde med samme klip-tempo.',
      suggested_client: 'Chateau Motel',
      videos: [
        {
          url: 'https://www.tiktok.com/@example/video/0000000000000000000',
          platform: 'tiktok',
          title: 'Demo video - ingen rigtig Jarvis-forbindelse',
          author: '@example',
          thumbnail_url: null,
          embed_type: 'tiktok_oembed',
          posted_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          verified_at: new Date().toISOString()
        }
      ]
    }
  ]
}

export async function fetchLatestTrends(): Promise<{ data: unknown; demo: boolean }> {
  if (!trendsConfigured()) {
    return { data: DEMO_TRENDS, demo: true }
  }

  // Del B (~/jarvis, branch trends-endpoint) now builds this: a small
  // standalone HTTP server on its own internal port, GET /trends/latest,
  // bearer-auth. Not merged/deployed on the Jarvis side yet as of this
  // branch - this call will fail (connection refused, or 404 with no
  // trends file yet) until it is, and falls back to demo data below so
  // the page still works either way.
  try {
    const url = `${process.env.JARVIS_TRENDS_URL!.replace(/\/$/, '')}/trends/latest`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.JARVIS_TRENDS_API_KEY}` },
      signal: AbortSignal.timeout(15_000)
    })
    if (!res.ok) throw new Error(`status ${res.status}`)
    return { data: await res.json(), demo: false }
  } catch (e) {
    console.error('fetchLatestTrends: falling back to demo data -', e instanceof Error ? e.message : e)
    return { data: DEMO_TRENDS, demo: true }
  }
}

export interface SpeechAlignment {
  characters: string[]
  characterStartTimesSeconds: number[]
  characterEndTimesSeconds: number[]
}

export interface SpeechResult {
  audioBase64: string | null
  alignment: SpeechAlignment | null
  demo: boolean
}

// Uses ElevenLabs' with-timestamps endpoint (character-level alignment)
// rather than the plain TTS endpoint, so the HUD can pulse the hexagon
// core precisely on syllable boundaries instead of only reacting to raw
// audio amplitude. Falls back to the plain endpoint (no alignment) if
// with-timestamps ever fails, so speech never breaks outright.
export async function synthesizeSpeech(text: string): Promise<SpeechResult> {
  if (!elevenLabsConfigured()) {
    return { audioBase64: null, alignment: null, demo: true }
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID
  const apiKey = process.env.ELEVENLABS_API_KEY!

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
      signal: AbortSignal.timeout(30_000)
    })
    if (!res.ok) throw new Error(`ElevenLabs with-timestamps request failed: ${res.status}`)
    const data = await res.json()
    const align = data.alignment || data.normalized_alignment
    return {
      audioBase64: data.audio_base64,
      alignment: align
        ? {
            characters: align.characters,
            characterStartTimesSeconds: align.character_start_times_seconds,
            characterEndTimesSeconds: align.character_end_times_seconds
          }
        : null,
      demo: false
    }
  } catch (e) {
    console.error('synthesizeSpeech: with-timestamps failed, falling back to plain TTS -', e instanceof Error ? e.message : e)
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
    signal: AbortSignal.timeout(30_000)
  })
  if (!res.ok) throw new Error(`ElevenLabs request failed: ${res.status}`)
  const buf = await res.arrayBuffer()
  return { audioBase64: Buffer.from(buf).toString('base64'), alignment: null, demo: false }
}
