// Lightweight, process-local counters for the Jarvis HUD's "network
// activity" line graph and uptime panel. These are real signals, not demo
// data - they count actual admin-gated API requests this process has
// handled and how long the process has been running. They reset on
// restart/redeploy, same as any in-memory counter would; that is expected
// for a live pulse, not a persisted analytics store.
const BUCKET_MS = 60_000
const MAX_BUCKETS = 20

let buckets: number[] = new Array(MAX_BUCKETS).fill(0)
let bucketStart = Math.floor(Date.now() / BUCKET_MS)

function rotate() {
  const current = Math.floor(Date.now() / BUCKET_MS)
  const diff = current - bucketStart
  if (diff <= 0) return
  const shift = Math.min(diff, MAX_BUCKETS)
  buckets = [...buckets.slice(shift), ...new Array(shift).fill(0)]
  bucketStart = current
}

export function recordAdminRequest() {
  rotate()
  buckets[MAX_BUCKETS - 1] += 1
}

export function getRequestHistory(): number[] {
  rotate()
  return [...buckets]
}

export function getProcessUptimeSeconds(): number {
  return Math.floor(process.uptime())
}
