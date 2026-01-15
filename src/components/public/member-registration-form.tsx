'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, Mail, User } from 'lucide-react'
import { registerMember } from '@/app/actions/register-member'
import { useToast } from '@/components/ui/use-toast'

interface MemberRegistrationFormProps {
  orgSlug: string
  orgName: string
}

export function MemberRegistrationForm({ orgSlug, orgName }: MemberRegistrationFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await registerMember(
        orgSlug,
        formData.email,
        formData.firstName || undefined,
        formData.lastName || undefined
      )

      if (result.success) {
        setSuccess(true)
        toast({
          title: 'Sėkmė!',
          description: result.requiresApproval
            ? 'Jūsų prašymas gautas. Gausite patvirtinimo el. laišką.'
            : 'Sveiki atvykę! Gausite patvirtinimo el. laišką.',
        })
      } else {
        setError(result.error || 'Nepavyko užsiregistruoti')
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko užsiregistruoti',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      setError(err.message || 'Įvyko netikėta klaida')
      toast({
        title: 'Klaida',
        description: err.message || 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-6">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-emerald-900 mb-1">Prašymas gautas!</h3>
            <p className="text-sm text-emerald-700 mb-3">
              Dėkojame už jūsų prašymą tapti bendruomenės nariu.
            </p>
            <p className="text-xs text-emerald-600 bg-emerald-100/50 rounded-lg px-3 py-2">
              Jūsų prašymas bus peržiūrėtas. Gausite patvirtinimo el. laišką, kai narystė bus patvirtinta.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-700 font-medium text-sm">
          El. paštas
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="jūsų@elpaštas.lt"
            disabled={loading}
            className="pl-10 h-12 rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-slate-700 font-medium text-sm">
            Vardas
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="Vardas"
              disabled={loading}
              className="pl-10 h-12 rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-slate-700 font-medium text-sm">
            Pavardė
          </Label>
          <Input
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            placeholder="Pavardė"
            disabled={loading}
            className="h-12 rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 transition-colors"
          />
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-emerald-200" 
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Registruojama...
          </>
        ) : (
          <>
            Tapti nariu
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

      <p className="text-xs text-slate-400 text-center leading-relaxed">
        Registruodamiesi sutinkate su bendruomenės taisyklėmis ir privatumo politika
      </p>
      
      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
        <p className="text-xs text-slate-500 text-center">
          <strong>Naujas vartotojas?</strong> Pirmiausia susikurkite paskyrą naudodami mygtuką &quot;Prisijungti prie paskyros&quot; žemiau.
        </p>
      </div>
    </form>
  )
}
