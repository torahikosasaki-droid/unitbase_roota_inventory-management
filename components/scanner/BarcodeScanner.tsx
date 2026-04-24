'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'
import { parseImeiFromBarcode } from '@/lib/imei'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface BarcodeScannerProps {
  onScan: (imei: string) => void
  isActive: boolean
  onClose?: () => void
}

export function BarcodeScanner({ onScan, isActive, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    if (!isActive) return

    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader
    setScanning(true)
    setError(null)

    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current!,
        (result, err) => {
          if (result) {
            const raw = result.getText()
            const imei = parseImeiFromBarcode(raw) ?? raw
            if (navigator.vibrate) navigator.vibrate(100)
            onScan(imei)
          }
          if (err && !(err instanceof NotFoundException)) {
            console.warn('Scanner error:', err)
          }
        }
      )
      .catch((e) => {
        setError('カメラへのアクセスが許可されていません')
        setScanning(false)
        console.error(e)
      })

    return () => {
      BrowserMultiFormatReader.releaseAllStreams()
      readerRef.current = null
      setScanning(false)
    }
  }, [isActive, onScan])

  const handleManualSubmit = () => {
    const trimmed = manualInput.trim()
    if (!trimmed) return
    const imei = parseImeiFromBarcode(trimmed) ?? trimmed
    onScan(imei)
    setManualInput('')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Camera viewfinder */}
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video w-full">
        <video ref={videoRef} className="w-full h-full object-cover" />
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-white/70 rounded w-48 h-24 opacity-70" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <p className="text-white text-sm text-center px-4">{error}</p>
          </div>
        )}
      </div>

      {/* Manual input fallback */}
      <div className="flex gap-2">
        <Input
          type="number"
          inputMode="numeric"
          placeholder="IMEIを手入力（15桁）"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
          className="flex-1"
        />
        <Button onClick={handleManualSubmit} variant="outline">
          追加
        </Button>
      </div>

      {onClose && (
        <Button onClick={onClose} variant="ghost" className="w-full">
          閉じる
        </Button>
      )}
    </div>
  )
}
