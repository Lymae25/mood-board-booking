'use client'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useTranslation } from '@/lib/useTranslation'

type Step = 'loading' | 'disabled' | 'enrolling' | 'enabled'

// Admin-only TOTP 2FA settings: enable (QR code + confirm), or disable.
// Talks to the existing POST/PUT/DELETE /api/admin/totp routes (already
// admin-session-gated) - this component only adds the UI around them. The
// QR code is rendered fully client-side from the otpauth:// URI (the
// `qrcode` package, no network call) so the TOTP secret never leaves the
// browser except to this app's own same-origin API.
export default function TotpSettings() {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('loading')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/admin/session')
      .then(r => r.json())
      .then(d => setStep(d.totpEnabled ? 'enabled' : 'disabled'))
      .catch(() => setStep('disabled'))
  }, [])

  async function startEnroll() {
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/admin/totp', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'server_error')
      setSecret(data.secret)
      const dataUrl = await QRCode.toDataURL(data.uri, { margin: 1, width: 220 })
      setQrDataUrl(dataUrl)
      setCode('')
      setStep('enrolling')
    } catch {
      setError(t('admin.totpStartError', 'Kunne ikke starte opsætning af 2FA. Prøv igen.'))
    } finally {
      setBusy(false)
    }
  }

  async function confirmEnroll() {
    if (code.trim().length !== 6) return
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/admin/totp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: code.trim() })
      })
      if (!res.ok) {
        setError(t('admin.totpInvalidCode', 'Forkert kode. Tjek din autenticator-app og prøv igen.'))
        return
      }
      setStep('enabled')
      setQrDataUrl('')
      setSecret('')
      setCode('')
    } catch {
      setError(t('admin.totpStartError', 'Kunne ikke starte opsætning af 2FA. Prøv igen.'))
    } finally {
      setBusy(false)
    }
  }

  function cancelEnroll() {
    setStep('disabled')
    setQrDataUrl('')
    setSecret('')
    setCode('')
    setError('')
  }

  async function disable2fa() {
    if (!confirm(t('admin.totpDisableConfirm', 'Slå 2FA fra? Du kan altid slå det til igen senere.'))) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/totp', { method: 'DELETE' })
      if (!res.ok) throw new Error('server_error')
      setStep('disabled')
    } catch {
      setError(t('admin.totpStartError', 'Kunne ikke starte opsætning af 2FA. Prøv igen.'))
    } finally {
      setBusy(false)
    }
  }

  const boxStyle: React.CSSProperties = { border: '1px solid #333', padding: '30px', maxWidth: '480px' }
  const labelStyle: React.CSSProperties = { fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }
  const primaryBtn: React.CSSProperties = { padding: '12px 24px', minHeight: '44px', backgroundColor: '#fff', border: 'none', color: '#000', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }
  const secondaryBtn: React.CSSProperties = { padding: '12px 24px', minHeight: '44px', backgroundColor: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>
        {t('admin.totpHeading', 'To-faktor-godkendelse (2FA)')}
      </h2>
      <p style={{ fontSize: '12px', color: '#999', marginBottom: '30px', maxWidth: '480px' }}>
        {t('admin.totpIntro', 'Beskytter admin-login med en engangskode fra en autenticator-app (fx Google Authenticator eller Authy), ud over adgangskoden.')}
      </p>

      {step === 'loading' && <p style={{ color: '#666', fontSize: '12px' }}>{t('common.loading', 'LOADING')}</p>}

      {step === 'disabled' && (
        <div style={boxStyle}>
          <p style={{ fontSize: '13px', color: '#fbbf24', marginBottom: '20px' }}>{t('admin.totpStatusOff', '2FA er slået FRA')}</p>
          <button onClick={startEnroll} disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
            {t('admin.totpEnableBtn', 'Slå 2FA til')}
          </button>
          {error && <p style={{ color: '#ff6666', fontSize: '11px', marginTop: '14px' }}>{error}</p>}
        </div>
      )}

      {step === 'enrolling' && (
        <div style={boxStyle}>
          <p style={{ fontSize: '12px', color: '#999', marginBottom: '16px' }}>
            {t('admin.totpScanInstructions', 'Scan QR-koden med din autenticator-app, eller indtast koden manuelt.')}
          </p>
          {qrDataUrl && (
            /* eslint-disable-next-line @next/next/no-img-element -- a locally-generated data: URL, not a remote image next/image would optimize */
            <img src={qrDataUrl} alt="QR-kode til 2FA-opsætning" width={220} height={220} style={{ display: 'block', marginBottom: '16px', background: '#fff', padding: '8px' }} />
          )}
          {secret && (
            <p style={{ fontSize: '11px', color: '#666', marginBottom: '24px', wordBreak: 'break-all', fontFamily: 'monospace' }}>
              {t('admin.totpManualSecret', 'Manuel kode:')} {secret}
            </p>
          )}
          <label style={labelStyle}>{t('admin.totpCodeLabel', '6-cifret kode fra appen')}</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            pattern="[0-9]{6}"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', fontSize: '20px', letterSpacing: '4px', outline: 'none', marginBottom: '24px' }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: '15px' }}>
            <button onClick={confirmEnroll} disabled={busy || code.length !== 6} style={{ ...primaryBtn, opacity: busy || code.length !== 6 ? 0.5 : 1 }}>
              {t('admin.totpConfirmBtn', 'Bekræft og slå til')}
            </button>
            <button onClick={cancelEnroll} disabled={busy} style={secondaryBtn}>
              {t('common.cancel', 'Annuller')}
            </button>
          </div>
          {error && <p style={{ color: '#ff6666', fontSize: '11px', marginTop: '14px' }}>{error}</p>}
        </div>
      )}

      {step === 'enabled' && (
        <div style={boxStyle}>
          <p style={{ fontSize: '13px', color: '#4ade80', marginBottom: '20px' }}>{t('admin.totpStatusOn', '2FA er slået TIL')}</p>
          <button onClick={disable2fa} disabled={busy} style={{ ...secondaryBtn, opacity: busy ? 0.6 : 1 }}>
            {t('admin.totpDisableBtn', 'Slå 2FA fra')}
          </button>
          {error && <p style={{ color: '#ff6666', fontSize: '11px', marginTop: '14px' }}>{error}</p>}
        </div>
      )}
    </div>
  )
}
