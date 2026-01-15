import Link from 'next/link'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Button } from '@/components/ui/button'

import { ActivePosition } from '@/app/actions/public-community-page'



interface CommunityAboutSectionProps {

  description: string | null

  activePositions: ActivePosition[]

  orgSlug: string

}



export function CommunityAboutSection({

  description,

  activePositions,

  orgSlug,

}: CommunityAboutSectionProps) {

  return (

    <section id="about" className="py-12 md:py-16 bg-white">

      <div className="container mx-auto px-4">

        <div className="max-w-5xl mx-auto space-y-8">

          <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">

            <Card>

              <CardHeader className="pb-3">

                <CardTitle className="text-2xl md:text-3xl font-bold text-slate-900">

                  Apie bendruomenę

                </CardTitle>

              </CardHeader>

              <CardContent>

                {description ? (

                  <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap">

                    {description}

                  </p>

                ) : (

                  <p className="text-lg text-slate-600 leading-relaxed">

                    Informacija apie bendruomenę ruošiama. Jei esate narys, prisijunkite ir papildykite profilį.

                  </p>

                )}

              </CardContent>

            </Card>



            <Card className="bg-slate-50">

              <CardHeader className="pb-3">

                <CardTitle className="text-lg font-semibold text-slate-900">

                  Greita orientacija

                </CardTitle>

              </CardHeader>

              <CardContent className="space-y-3">

                <p className="text-sm text-slate-600">

                  Prisijungę matysite projektus, sąskaitas, renginius ir sprendimus, kurie aktualūs jūsų narystei.

                </p>

                <Button asChild className="w-full">

                  <Link href={`/login?redirect=/dashboard/${orgSlug}`}>

                    Prisijungti kaip nariui

                  </Link>

                </Button>

                <Button asChild variant="outline" className="w-full">

                  <Link href="#activity">Peržiūrėti viešą veiklą</Link>

                </Button>

              </CardContent>

            </Card>

          </div>



          <div>

            <h2 id="leadership" className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">

              Valdyba

            </h2>

            {activePositions.length > 0 ? (

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {activePositions.map((position) => (

                  <Card key={position.id}>

                    <CardHeader className="pb-3">

                      <CardTitle className="text-sm font-medium text-slate-600">

                        {position.title}

                      </CardTitle>

                    </CardHeader>

                    <CardContent>

                      <p className="text-lg font-semibold text-slate-900">

                        {position.full_name || 'Nepriskirtas'}

                      </p>

                    </CardContent>

                  </Card>

                ))}

              </div>

            ) : (

              <div className="rounded-lg border border-dashed p-6 text-slate-500">

                Valdybos informacija dar nepaskelbta.

              </div>

            )}

          </div>

        </div>

      </div>

    </section>

  )

}

