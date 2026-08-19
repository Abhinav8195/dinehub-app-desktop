import { useEffect, useRef, useState } from 'react'
import { Image, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { resolveMenuImageUrl } from '@/api/menu.api'

interface UploadResult {
  ok: boolean
  payload?: { data?: { imageUrl?: string; url?: string; fileUrl?: string } }
  error?: { message?: string }
}

interface ImageUploadFieldProps {
  kind: 'category' | 'item' | 'combo'
  value?: string
  onUploaded: (imageUrl: string) => void
  onUploadingChange: (uploading: boolean) => void
}

function extractImageUrl(result: UploadResult): string | undefined {
  const data = result.payload?.data
  const candidates = [data?.imageUrl, data?.url, data?.fileUrl]
  return candidates.find((value): value is string => typeof value === 'string' && value.length > 0)
}

export function ImageUploadField({ kind, value, onUploaded, onUploadingChange }: ImageUploadFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(resolveMenuImageUrl(value))
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const localPreviewRef = useRef<string | null>(null)

  useEffect(() => {
    const resolved = resolveMenuImageUrl(value)
    setPreviewUrl(resolved || localPreviewRef.current)
  }, [value])

  const selectAndUpload = async () => {
    setError(null)
    try {
      const file = await window.electronAPI.menuImages.select(kind)
      if (!file) return
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimeType)) {
        throw new Error('Select a JPEG, PNG, WebP, or GIF image')
      }
      const maxSizeMb = kind === 'combo' ? 5 : 1
      if (file.size > maxSizeMb * 1024 * 1024) throw new Error(`Image must be ${maxSizeMb} MB or smaller`)

      localPreviewRef.current = file.previewUrl
      setLocalPreview(file.previewUrl)
      setPreviewUrl(file.previewUrl)
      setUploading(true)
      onUploadingChange(true)
      setProgress(5)

      const result = await window.electronAPI.menuImages.upload(kind, {
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        base64: file.base64
      }, setProgress) as UploadResult

      if (!result.ok) throw new Error(result.error?.message || 'Image upload failed')
      const imageUrl = extractImageUrl(result)
      if (!imageUrl) throw new Error('Upload response did not contain an image URL')

      onUploaded(imageUrl)
      const remoteUrl = resolveMenuImageUrl(imageUrl)
      // Prefer remote URL when CSP allows it; keep local data URL as visible fallback.
      setPreviewUrl(remoteUrl || file.previewUrl)
      setProgress(100)
      toast.success('Image uploaded')
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Image upload failed'
      setError(message)
      toast.error(message)
      if (!value) {
        setPreviewUrl(null)
        setLocalPreview(null)
        localPreviewRef.current = null
      }
    } finally {
      setUploading(false)
      onUploadingChange(false)
    }
  }

  const displayUrl = previewUrl || localPreview

  return (
    <div className="space-y-2">
      <Label>Image</Label>
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Selected preview"
              className="h-full w-full object-cover"
              onError={(event) => {
                if (localPreview && event.currentTarget.src !== localPreview) {
                  event.currentTarget.src = localPreview
                  return
                }
                event.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <Image className="h-8 w-8 text-muted-foreground/40" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Button type="button" variant="outline" size="sm" onClick={selectAndUpload} disabled={uploading}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {displayUrl ? 'Replace image' : 'Select image'}
          </Button>
          <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, or GIF · maximum {kind === 'combo' ? 5 : 1} MB</p>
          {uploading && (
            <div className="space-y-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
              <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
            </div>
          )}
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </div>
    </div>
  )
}
