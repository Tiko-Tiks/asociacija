'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface OrgLogoUploadProps {
  orgId: string
  currentLogoUrl?: string | null
  orgName: string
}

export function OrgLogoUpload({ orgId, currentLogoUrl, orgName }: OrgLogoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentLogoUrl || null)
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const router = useRouter()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    if (!selectedFile.type.startsWith('image/')) {
      toast({
        title: 'Klaida',
        description: 'Failas turi būti paveikslėlis',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (selectedFile.size > maxSize) {
      toast({
        title: 'Klaida',
        description: 'Failas per didelis. Maksimalus dydis: 5MB',
        variant: 'destructive',
      })
      return
    }

    setFile(selectedFile)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(selectedFile)
  }

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'Klaida',
        description: 'Pasirinkite failą',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('orgId', orgId)

      const response = await fetch('/api/org-logo/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Nepavyko įkelti logotipo')
      }

      toast({
        title: 'Sėkmė',
        description: 'Logotipas sėkmingai įkeltas',
      })

      // Refresh page to show new logo
      router.refresh()
    } catch (error: any) {
      console.error('Error uploading logo:', error)
      toast({
        title: 'Klaida',
        description: error.message || 'Nepavyko įkelti logotipo',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setFile(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveCurrent = async () => {
    try {
      const response = await fetch('/api/org-logo/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orgId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Nepavyko pašalinti logotipo')
      }

      toast({
        title: 'Sėkmė',
        description: 'Logotipas pašalintas',
      })

      router.refresh()
    } catch (error: any) {
      console.error('Error removing logo:', error)
      toast({
        title: 'Klaida',
        description: error.message || 'Nepavyko pašalinti logotipo',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">Organizacijos logotipas</Label>
        <p className="text-sm text-slate-600 mt-1">
          Pridėkite organizacijos logotipą arba avatarą. Rekomenduojamas dydis: 200x200px. Maksimalus failo dydis: 5MB.
        </p>
      </div>

      {/* Current Logo Preview */}
      {currentLogoUrl && !preview && (
        <div className="relative inline-block">
          <Avatar className="w-32 h-32 rounded-lg border-2 border-slate-200">
            <AvatarImage src={currentLogoUrl} alt={`${orgName} logotipas`} className="object-cover" />
            <AvatarFallback className="bg-slate-100 text-slate-600 text-lg font-semibold rounded-lg">
              {orgName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 rounded-full w-6 h-6 p-0"
            onClick={handleRemoveCurrent}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="relative inline-block">
          <Avatar className="w-32 h-32 rounded-lg border-2 border-slate-200">
            {file ? (
              <AvatarImage src={preview} alt="Peržiūra" className="object-cover" />
            ) : (
              <AvatarFallback className="bg-slate-100">
                <ImageIcon className="h-12 w-12 text-slate-400" />
              </AvatarFallback>
            )}
            <AvatarFallback className="bg-slate-100 text-slate-600 text-lg font-semibold rounded-lg">
              {orgName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {file && (
            <Button
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 rounded-full w-6 h-6 p-0"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* No Logo State */}
      {!currentLogoUrl && !preview && (
        <Avatar className="w-32 h-32 rounded-lg border-2 border-dashed border-slate-300">
          <AvatarFallback className="bg-slate-50">
            <ImageIcon className="h-12 w-12 text-slate-400" />
          </AvatarFallback>
        </Avatar>
      )}

      {/* File Input */}
      <div className="space-y-2">
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="logo-upload"
          disabled={uploading}
        />
        <Label htmlFor="logo-upload" asChild>
          <Button
            variant="outline"
            type="button"
            className="w-full sm:w-auto"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {currentLogoUrl ? 'Pakeisti logotipą' : 'Pridėti logotipą'}
          </Button>
        </Label>
      </div>

      {/* Upload Button */}
      {file && (
        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="flex-1 sm:flex-initial"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Įkeliama...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Įkelti
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleRemove}
            disabled={uploading}
          >
            Atšaukti
          </Button>
        </div>
      )}
    </div>
  )
}

