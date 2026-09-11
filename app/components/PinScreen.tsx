'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/useTranslation'
import { resolveUploadUrl } from '@/lib/resolveUploadUrl'
import LanguageSwitcher from './LanguageSwitcher'

export default function PinScreen({ customerId }: { customerId: string }) {
  const [pin, setPin] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [customer, setCustomer] = useState<any>(null)
  const router = useRouter()
  const { t } = useTranslation()

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(data => {
      const c = data.find((x: any) => x.id === customerId)
      setCustomer(c)
    })
  }, [customerId])

  function handleChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return
    const newPin = [...pin]
    newPin[index] = value
    setPin(newPin)
    if (value && index < 3) {
      const next = document.getElementById(`pin-${index + 1}`)
      next?.focus()
    }
    if (newPin.every(p => p !== '') && newPin.join('').length === 4) {
      verify(newPin.join(''))
    }
  }

  function handleKeyDown(index: number, e: any) {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prev = document.getElementById(`pin-${index - 1}`)
      prev?.focus()
    }
  }

  async function verify(fullPin: string) {
    const res = await fetch('/api/verify-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId, pin: fullPin }) })
    const data = await res.json()
    if (data.valid) {
      router.push(`/customer/${customerId}`)
    } else {
      setError(t('pin.wrongCode', 'Forkert kode'))
      setPin(['', '', '', ''])
      setTimeout(() => { setError(''); document.getElementById('pin-0')?.focus() }, 1500)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <LanguageSwitcher />
      {customer && (
        <>
          <div style={{ width: '160px', height: '160px', borderRadius: '50%', border: '2px solid #333', overflow: 'hidden', marginBottom: '30px', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {customer.logoUrl ? <img src={resolveUploadUrl(customer.logoUrl)} alt={customer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '48px', color: '#666' }}>{customer.name.charAt(0)}</span>}
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase' }}>{customer.name}</h2>
        </>
      )}
      <p style={{ fontSize: '12px', color: '#999', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '40px' }}>{t('pin.enterCode', 'Indtast 4-cifret kode')}</p>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        {pin.map((digit, i) => (
          <input
            key={i}
            id={`pin-${i}`}
            type="password"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            autoFocus={i === 0}
            style={{ width: '60px', height: '80px', backgroundColor: 'transparent', border: '1px solid #333', color: '#fff', fontSize: '32px', textAlign: 'center', outline: 'none' }}
          />
        ))}
      </div>

      {error && <p style={{ color: '#ff6666', fontSize: '14px', marginBottom: '20px' }}>{error}</p>}

      <button onClick={() => router.push('/')} style={{ marginTop: '40px', padding: '10px 24px', backgroundColor: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>← {t('common.back', 'Tilbage')}</button>
    </div>
  )
}
