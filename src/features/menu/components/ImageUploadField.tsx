import { useEffect, useState } from 'react'
import { Image, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { resolveMenuImageUrl } from '@/api/menu.api'

interface UploadResult {
  ok: boolean
  payload?: { data?: { imageUrl?: string } }
  error?: { message?: string }
}

interface ImageUploadFieldProps {
  kind: 'category' | 'item'
  value?: string
  onUploaded: (imageUrl: string) => void
  onUploadingChange: (uploading: boolean) => void
}

export function ImageUploadField({ kind, value, onUploaded, onUploadingChange }: ImageUploadFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(resolveMenuImageUrl(value))
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setPreviewUrl(resolveMenuImageUrl(value)), [value])

  const selectAndUpload = async () => {
    setError(null)
    try {
      const file = await window.electronAPI.menuImages.select()
      if (!file) return
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimeType)) {
        throw new Error('Select a JPEG, PNG, WebP, or GIF image')
      }
      if (file.size > 5 * 1024 * 1024) throw new Error('Image must be 5 MB or smaller')
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
      const imageUrl = result.payload?.data?.imageUrl
      if (!imageUrl) throw new Error('Upload response did not contain an image URL')
      onUploaded(imageUrl)
      setPreviewUrl(resolveMenuImageUrl(imageUrl))
      setProgress(100)
      toast.success('Image uploaded')
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Image upload failed'
      setError(message)
      toast.error(message)
    } finally {
      setUploading(false)
      onUploadingChange(false)
    }
  }

  return (
    <div className="space-y-2">
      <Label>Image</Label>
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
          {previewUrl ? <img src={previewUrl} alt="Selected preview" className="h-full w-full object-cover" /> : <Image className="h-8 w-8 text-muted-foreground/40" />}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Button type="button" variant="outline" size="sm" onClick={selectAndUpload} disabled={uploading}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {previewUrl ? 'Replace image' : 'Select image'}
          </Button>
          <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, or GIF · maximum 5 MB</p>
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
