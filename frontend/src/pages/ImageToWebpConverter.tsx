import { useEffect, useMemo, useRef, useState } from 'react'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import ToolPageLayout from '../components/ToolPageLayout'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface LoadedImage {
  file: File
  bitmap: ImageBitmap
}

// Re-encoding on every slider tick would redraw the full image dozens of
// times per second while dragging — this waits for the pointer to settle.
const ENCODE_DEBOUNCE_MS = 250

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(2)} MB`
}

function outputFilename(originalName: string): string {
  return originalName.replace(/\.[^./\\]+$/, '') + '.webp'
}

export default function ImageToWebpConverter() {
  const [image, setImage] = useState<LoadedImage | null>(null)
  const [quality, setQuality] = useState(80)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Frees the previous decoded bitmap whenever it's replaced or the page
  // unmounts — ImageBitmap holds decoded pixel data outside JS heap
  // tracking, so this doesn't just happen via garbage collection alone.
  useEffect(() => {
    return () => {
      image?.bitmap.close()
    }
  }, [image])

  // Debounced re-encode: fires ~250ms after the image or quality last
  // changed, restarting the timer (via the effect cleanup) on every
  // intermediate slider tick instead of encoding each one.
  useEffect(() => {
    if (!image) return

    const timeout = window.setTimeout(() => {
      const canvas = document.createElement('canvas')
      canvas.width = image.bitmap.width
      canvas.height = image.bitmap.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setStatus('error')
        setErrorMessage('This browser could not create a 2D canvas context.')
        return
      }
      ctx.drawImage(image.bitmap, 0, 0)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setStatus('error')
            setErrorMessage('WebP encoding failed for this image — try a different file.')
            return
          }
          setResultBlob(blob)
          setStatus('success')
        },
        'image/webp',
        quality / 100,
      )
    }, ENCODE_DEBOUNCE_MS)

    return () => window.clearTimeout(timeout)
  }, [image, quality])

  // Derived, not stored: the URL only needs to exist for as long as the
  // blob it was created from. The effect below just revokes it — creating
  // it during render (instead of via a setState-in-effect) means there's
  // no extra render just to hand the URL back to the component that
  // already has the blob it came from.
  const resultUrl = useMemo(
    () => (resultBlob ? URL.createObjectURL(resultBlob) : null),
    [resultBlob],
  )
  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl)
    }
  }, [resultUrl])

  async function loadFile(file: File) {
    setResultBlob(null)

    if (!file.type.startsWith('image/')) {
      setImage(null)
      setStatus('error')
      setErrorMessage(
        `"${file.name}" doesn't look like an image (${file.type || 'unknown type'}).`,
      )
      return
    }

    try {
      const bitmap = await createImageBitmap(file)
      setImage({ file, bitmap })
      setStatus('loading')
    } catch {
      setImage(null)
      setStatus('error')
      setErrorMessage(`Couldn't decode "${file.name}" — it may be corrupted or unsupported.`)
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) void loadFile(file)
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) void loadFile(file)
    event.target.value = ''
  }

  const percentChange =
    image && resultBlob ? ((image.file.size - resultBlob.size) / image.file.size) * 100 : null

  return (
    <ToolPageLayout
      title="Image → WebP"
      description="Drop in a JPG, PNG, or other raster image and get back a smaller WebP — nothing here is uploaded, the conversion happens entirely in your browser."
    >
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors ${
          isDragging ? 'border-keyword bg-keyword/5' : 'border-rule'
        }`}
      >
        <p className="font-display text-sm text-ink/60">Drag an image here, or</p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-3 rounded-md border border-rule px-3 py-1.5 font-display text-sm text-ink/70 hover:border-keyword hover:text-keyword"
        >
          choose a file
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      <p className="mt-3 font-body text-xs text-ink/50">
        EXIF metadata, including location data, is automatically removed during conversion.
      </p>

      {image && (
        <div className="mt-6">
          <label htmlFor="quality" className="font-display text-xs tracking-wide text-ink/60 uppercase">
            Quality — {quality}
          </label>
          <input
            id="quality"
            type="range"
            min={0}
            max={100}
            value={quality}
            onChange={(event) => {
              setQuality(Number(event.target.value))
              setStatus('loading')
            }}
            className="mt-2 w-full accent-keyword"
          />
        </div>
      )}

      <div className="mt-6">
        {status === 'loading' && <LoadingState />}
        {status === 'error' && <ErrorState message={errorMessage} />}
        {status === 'success' && image && resultBlob && resultUrl && percentChange !== null && (
          <div className="rounded-md border border-rule bg-paper px-4 py-3">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 font-display text-sm">
              <dt className="text-ink/50">Original</dt>
              <dd className="truncate text-ink">
                {image.file.name} — {formatBytes(image.file.size)}
              </dd>
              <dt className="text-ink/50">Converted</dt>
              <dd className="text-ink">{formatBytes(resultBlob.size)}</dd>
              <dt className="text-ink/50">Change</dt>
              <dd className={percentChange >= 0 ? 'text-string' : 'text-flag'}>
                {percentChange >= 0 ? '↓' : '↑'} {Math.abs(percentChange).toFixed(1)}%
              </dd>
            </dl>
            <a
              href={resultUrl}
              download={outputFilename(image.file.name)}
              className="mt-4 inline-block rounded-md bg-keyword px-4 py-2 font-display text-sm text-accent-ink transition-opacity hover:opacity-90"
            >
              Download {outputFilename(image.file.name)}
            </a>
          </div>
        )}
      </div>
    </ToolPageLayout>
  )
}
