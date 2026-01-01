import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageLayout } from '@/components/layout/page-layout'
import { Home, Search, ArrowLeft } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'

export default function NotFound() {
  return (
    <PageLayout showHeader={true} showFooter={false}>
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Search className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-slate-900">
              Puslapis nerastas
            </CardTitle>
            <CardDescription className="text-base">
              Puslapis, kurio ieškote, neegzistuoja arba buvo perkeltas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border bg-slate-50 p-6">
              <p className="text-sm text-slate-600">
                Patikrinkite URL adresą arba naudokite navigaciją, kad rastumėte tai, ko ieškote.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                asChild 
                className="flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Grįžti į pagrindinį
                </Link>
              </Button>
              <BackButton 
                variant="outline" 
                className="flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Grįžti atgal
              </BackButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
