import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, User, LogIn, UserPlus } from 'lucide-react'
import Link from 'next/link'

interface CommunityContactProps {
  name: string
  email: string | null
  contactPerson: string | null
}

/**
 * Contact Section
 * 
 * Contact information:
 * - Email (general)
 * - Contact person (name only, no personal code)
 * - Link to registration / login
 */
export function CommunityContact({
  name,
  email,
  contactPerson,
}: CommunityContactProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-slate-900">Kontaktai</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Susisiekite su mumis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {email && (
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">El. paštas</p>
                  <a
                    href={`mailto:${email}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {email}
                  </a>
                </div>
              </div>
            )}

            {contactPerson && (
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">Kontaktinis asmuo</p>
                  <p className="text-sm text-slate-600">{contactPerson}</p>
                </div>
              </div>
            )}

            {!email && !contactPerson && (
              <p className="text-sm text-slate-600 italic">
                Kontaktinė informacija dar nepridėta.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Prisijunkite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Norite prisijungti prie {name} valdymo sistemos?
            </p>
            <div className="flex flex-col gap-3">
              <Button asChild className="w-full">
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Prisijungti
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/register-community">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Registruoti bendruomenę
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

