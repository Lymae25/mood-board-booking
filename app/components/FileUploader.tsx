'use client'
import { useRef, useState } from 'react'
import { useTranslation } from '@/lib/useTranslation'

const ERROR_KEYS: Record<string, string> = {
  no_file: 'upload.errorNoFile',
  file_too_large: 'upload.errorTooLarge',
  invalid_type: 'upload.errorInvalidType',
  server_error: 'upload.errorServer'
}

export default function FileUploader({ value, onUploaded, accept = 'image/*,video/mp4,video/quicktime' }: { value?: string, onUploaded: (url: string) => void, accept?: string }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { t } = useTranslation()

  function translateError(code: string) {
    return t(ERROR_KEYS[code] || 'upload.errorServer', 'Upload fejlede')
  }

  function upload(file: File) {
    setError('')
    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      setUploading(false)
      try {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300 && data.url) {
          onUploaded(data.url)
        } else {
          setError(translateError(data.error))
        }
      } catch (e) {
        setError(translateError('server_error'))
      }
    }
    xhr.onerror = () => { setUploading(false); setError(translateError('server_error')) }
    xhr.send(formData)
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) upload(file)
  }

  const isVideo = value ? /\.(mp4|mov)(\?.*)?$/i.test(value) : false

  return (
    <div style={{ marginBottom: '15px' }}>
      <div
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        style={{ border: `1px dashed ${dragOver ? '#fff' : '#333'}`, padding: '20px', textAlign: 'center', cursor: 'pointer', marginBottom: '10px', transition: 'border-color 0.2s' }}
      >
        {uploading ? (
          <div>
            <div style={{ height: '4px', backgroundColor: '#333', marginBottom: '10px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, backgroundColor: '#fff', transition: 'width 0.15s' }} />
            </div>
            <span style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('upload.uploadingLabel', 'Uploader...')} {progress}%</span>
          </div>
        ) : value ? (
          isVideo ? (
            <video src={value} style={{ maxWidth: '100%', maxHeight: '200px' }} controls />
          ) : (
            <img src={value} alt="" style={{ maxWidth: '100%', maxHeight: '200px' }} />
          )
        ) : (
          <span style={{ color: '#666', fontSize: '12px' }}>{t('upload.dragDrop', 'Drag & drop fil eller klik')}</span>
        )}
        <input ref={inputRef} type="file" accept={accept} onChange={(e) => handleFiles(e.target.files)} style={{ display: 'none' }} />
      </div>
      {!uploading && (
        <button type="button" onClick={() => inputRef.current?.click()} style={{ padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('upload.chooseFile', 'Vælg fil')}</button>
      )}
      {error && <p style={{ color: '#ff6666', fontSize: '11px', marginTop: '8px' }}>{error}</p>}
    </div>
  )
}
