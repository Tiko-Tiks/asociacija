'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from 'lucide-react'
import { setPassword } from '@/app/actions/change-password'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'

interface PasswordSetupProps {
  email: string
  generatedPassword: string
  onComplete: () => void
  onSkip?: () => void
}

export function PasswordSetup({ email, generatedPassword, onComplete, onSkip }: PasswordSetupProps) {
  const [password, setPasswordValue] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const passwordRequirements = {
    minLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasLetter: /[a-zA-Z]/.test(password),
  }

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean)
  const passwordsMatch = password === confirmPassword && password.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isPasswordValid) {
      toast({
        title: 'Klaida',
        description: 'Slaptažodis neatitinka reikalavimų',
        variant: 'destructive',
      })
      return
    }

    if (!passwordsMatch) {
      toast({
        title: 'Klaida',
        description: 'Slaptažodžiai nesutampa',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const result = await setPassword(password)

      if (!result.success) {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko nustatyti slaptažodžio',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      toast({
        title: 'Sėkmė',
        description: 'Slaptažodis sėkmingai nustatytas',
      })

      onComplete()
    } catch (error) {
      console.error('Error setting password:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Lock className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-xl">Nustatyti slaptažodį</CardTitle>
            <CardDescription>
              Sukurkite savo slaptažodį paskyros saugumui
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-600 mb-1">
              <strong>Jūsų el. paštas:</strong> {email}
            </p>
            <p className="text-xs text-slate-500">
              Automatiškai sugeneruotas slaptažodis buvo išsiųstas el. paštu. Rekomenduojame jį pakeisti.
            </p>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Naujas slaptažodis <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPasswordValue(e.target.value)}
                placeholder="Bent 8 simboliai"
                className="pr-10"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            {/* Password Requirements */}
            <div className="space-y-1 text-xs">
              <div className={`flex items-center gap-2 ${passwordRequirements.minLength ? 'text-green-600' : 'text-slate-500'}`}>
                {passwordRequirements.minLength ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                <span>Bent 8 simboliai</span>
              </div>
              <div className={`flex items-center gap-2 ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-slate-500'}`}>
                {passwordRequirements.hasNumber ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                <span>Bent vienas skaičius</span>
              </div>
              <div className={`flex items-center gap-2 ${passwordRequirements.hasLetter ? 'text-green-600' : 'text-slate-500'}`}>
                {passwordRequirements.hasLetter ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                <span>Bent viena raidė</span>
              </div>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">
              Patvirtinti slaptažodį <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Pakartokite slaptažodį"
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Slaptažodžiai nesutampa
              </p>
            )}
            {passwordsMatch && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Slaptažodžiai sutampa
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="submit"
              disabled={!isPasswordValid || !passwordsMatch || loading}
              className="w-full"
            >
              {loading ? 'Nustatoma...' : 'Nustatyti slaptažodį'}
            </Button>
            {onSkip && (
              <Button
                type="button"
                variant="ghost"
                onClick={onSkip}
                disabled={loading}
                className="w-full"
              >
                Praleisti (naudoti sugeneruotą slaptažodį)
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

