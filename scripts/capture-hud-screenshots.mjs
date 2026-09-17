#!/usr/bin/env node
// Captures the screenshots documented in STATUS.md's "Jarvis HUD redesign"
// section, using Playwright against a locally running `next dev` server.
// Local/dev tool only - never run against production.
//
// Usage:
//   LOCAL_ADMIN_PASSWORD=... node scripts/capture-hud-screenshots.mjs
//
// Requires: `npm run dev` already running on http://localhost:3000, a
// local admin password already set (see STATUS.md, "Sådan tester du selv"),
// and the Playwright chromium browser installed once via
// `npx playwright install chromium`.
//
// Audio safety: Chromium is launched with --mute-audio AND
// window.speechSynthesis is fully stubbed out before any page loads, so
// the demo-mode "speaking" state never invokes the real OS text-to-speech
// engine - earlier manual testing found that it audibly spoke through the
// machine's speakers, which must never happen from an automated script.

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const BASE = process.env.HUD_SCREENSHOT_BASE_URL || 'http://localhost:3000'
const PW = process.env.LOCAL_ADMIN_PASSWORD
const DOCS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs')

if (!PW) {
  console.error('Set LOCAL_ADMIN_PASSWORD to your local (test-only) admin password and retry.')
  process.exit(1)
}

mkdirSync(DOCS, { recursive: true })

function stubSpeechSynthesis() {
  class FakeUtterance extends EventTarget {
    constructor(text) { super(); this.text = text; this.onboundary = null; this.onend = null; this.onerror = null }
  }
  window.SpeechSynthesisUtterance = FakeUtterance
  window.speechSynthesis = {
    speak(utterance) {
      const words = (utterance.text || '').split(/\s+/).filter(Boolean)
      let i = 0
      const step = () => {
        if (i < words.length) { utterance.onboundary?.(); i++; setTimeout(step, 80) }
        else { utterance.onend?.() }
      }
      setTimeout(step, 80)
    },
    cancel() {}
  }
}

async function login(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Admin Login' }).click()
  await page.getByPlaceholder('Admin adgangskode').fill(PW)
  await page.getByRole('button', { name: 'Login' }).click()
  await page.waitForURL('**/admin', { timeout: 10_000 })
}

async function main() {
  const browser = await chromium.launch({
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
      '--mute-audio'
    ]
  })

  const desktopCtx = await browser.newContext({ viewport: { width: 1680, height: 1000 } })
  await desktopCtx.grantPermissions(['microphone'])
  await desktopCtx.addInitScript(stubSpeechSynthesis)
  const page = await desktopCtx.newPage()
  page.on('pageerror', (err) => console.log('[browser pageerror]', err.message))

  await login(page)
  await page.goto(`${BASE}/admin/jarvis`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.jh-hexcore svg', { timeout: 15_000 })
  await page.waitForTimeout(1500) // let panels finish their fetches

  // 1. HVILE (idle)
  await page.screenshot({ path: `${DOCS}/jarvis-hud-hvile.png` })
  console.log('captured: hvile')

  // 2. LYTTER (listening) - warm up the fake-device permission handshake
  // once via a direct call, then click the real mic button.
  await page.evaluate(async () => { try { await navigator.mediaDevices.getUserMedia({ audio: true }) } catch { /* ignore */ } })
  await page.locator('button[title*="tale"]').first().click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${DOCS}/jarvis-hud-lytter.png` })
  console.log('captured: lytter')
  await page.locator('button[aria-pressed="true"]').first().click().catch(() => {})
  await page.waitForTimeout(300)

  // 3 & 4. TÆNKER (thinking) then TALER (speaking) - delay the chat route
  // so there's a real window to capture "thinking" before the reply lands.
  await page.route('**/api/jarvis/chat', async (route) => {
    await new Promise((r) => setTimeout(r, 1800))
    await route.continue()
  })
  const input = page.getByPlaceholder('SKRIV TIL JARVIS...')
  await input.fill('Fortæl mig om dagens trends')
  await input.press('Enter')
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${DOCS}/jarvis-hud-taenker.png` })
  console.log('captured: taenker')

  await page.waitForTimeout(1800)
  await page.screenshot({ path: `${DOCS}/jarvis-hud-taler.png` })
  console.log('captured: taler')
  await page.unroute('**/api/jarvis/chat')

  // 5. HOLOGRAM (trends)
  await page.getByRole('button', { name: 'TRENDS' }).click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${DOCS}/jarvis-hud-hologram-trends.png` })
  console.log('captured: hologram-trends')
  await page.getByRole('button', { name: 'Luk ✕' }).click().catch(() => {})

  await desktopCtx.close()

  // 6. MOBIL
  const mobileCtx = await browser.newContext({ viewport: { width: 420, height: 900 } })
  await mobileCtx.addInitScript(stubSpeechSynthesis)
  const mobilePage = await mobileCtx.newPage()
  await login(mobilePage)
  await mobilePage.goto(`${BASE}/admin/jarvis`, { waitUntil: 'networkidle' })
  await mobilePage.waitForSelector('.jh-hexcore svg', { timeout: 15_000 })
  await mobilePage.waitForTimeout(1500)
  await mobilePage.screenshot({ path: `${DOCS}/jarvis-hud-mobil.png`, fullPage: true })
  console.log('captured: mobil')
  await mobileCtx.close()

  await browser.close()
  console.log('all screenshots done')
}

main().catch((e) => { console.error(e); process.exit(1) })
