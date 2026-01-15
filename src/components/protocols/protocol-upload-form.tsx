'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { uploadProtocolPdf } from '@/app/actions/protocols'

interface ProtocolUploadFormProps {
  protocolId: string
  redirectPath?: string
}

export function ProtocolUploadForm({ protocolId, redirectPath }: ProtocolUploadFormProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast({
        title: 'Klaida',
        description: 'Tik PDF failai yra leidžiami',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast({
        title: 'Klaida',
        description: 'Failo dydis turi būti mažesnis nei 10MB',
        variant: 'destructive',
      })
      return
    }

    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const result = await uploadProtocolPdf(protocolId, formData)

      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: 'Pasirašytas protokolas sėkmingai įkeltas',
        })
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        // Redirect if path provided
        if (redirectPath) {
          router.push(redirectPath)
        } else {
          // Refresh the page to show updated protocol
          router.refresh()
        }
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko įkelti PDF',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error uploading PDF:', error)
      const errorMessage = error instanceof Error ? error.message : 'Įvyko netikėta klaida'
      toast({
        title: 'Klaida',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const file = e.dataTransfer.files?.[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
      if (fileInputRef.current) {
        // Create a FileList from the dropped file
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        fileInputRef.current.files = dataTransfer.files
      }
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-gray-600">
          Vilkite PDF failą čia arba paspauskite, kad pasirinktumėte
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Palaikomi formatai: PDF (iki 10MB)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          className="hidden"
          id="pdf-upload"
        />
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          Pasirinkti failą
        </Button>
      </div>

      {selectedFile && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Pasirinktas failas:</p>
                <p className="text-sm text-gray-600">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Įkeliama...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Įkelti
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
