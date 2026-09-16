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

export function elevenLabsConfigured(): boolean {
  return !!(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID)
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
  if (!jarvisConfigured()) {
    return { data: DEMO_TRENDS, demo: true }
  }

  // Assumption documented in STATUS.md: Jarvis's API server needs a small
  // route added that reads $HERMES_HOME/trends/latest.json and returns it,
  // gated by the same Bearer API_SERVER_KEY auth as /v1/chat/completions.
  // This is NOT yet built on the Jarvis side as of this branch - this call
  // will 404 until it is, and falls back to demo data below so the page
  // still works.
  try {
    const url = `${process.env.JARVIS_API_URL!.replace(/\/$/, '')}/v1/trends/latest`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.JARVIS_API_KEY}` },
      signal: AbortSignal.timeout(15_000)
    })
    if (!res.ok) throw new Error(`status ${res.status}`)
    return { data: await res.json(), demo: false }
  } catch (e) {
    console.error('fetchLatestTrends: falling back to demo data -', e instanceof Error ? e.message : e)
    return { data: DEMO_TRENDS, demo: true }
  }
}

export async function synthesizeSpeech(text: string): Promise<{ audio: ArrayBuffer | null; demo: boolean }> {
  if (!elevenLabsConfigured()) {
    return { audio: null, demo: true }
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY!
    },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
    signal: AbortSignal.timeout(30_000)
  })
  if (!res.ok) throw new Error(`ElevenLabs request failed: ${res.status}`)
  return { audio: await res.arrayBuffer(), demo: false }
}
