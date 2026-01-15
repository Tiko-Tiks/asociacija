'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Building2, Globe, Save } from 'lucide-react'
import {
  getBranduolysOrg,
  updateBranduolysOrg,
  getLandingPageContent,
  updateLandingPageContent,
  type BranduolysContent,
  type LandingPageContent,
} from '@/app/actions/admin/branduolys-content'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function BranduolysManagement() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [orgData, setOrgData] = useState<BranduolysContent | null>(null)
  const [landingContent, setLandingContent] = useState<LandingPageContent | null>(null)
  const [orgFormData, setOrgFormData] = useState({
    name: '',
    description: '',
  })
  const [landingFormData, setLandingFormData] = useState({
    heroTitle: '',
    heroSubtitle: '',
    definitionTitle: '',
    definitionContent: '',
    legalBaseTitle: '',
    legalBaseContent: '',
  })

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [org, landing] = await Promise.all([
        getBranduolysOrg(),
        getLandingPageContent(),
      ])

      if (org) {
        setOrgData(org)
        setOrgFormData({
          name: org.name,
          description: org.description || '',
        })
      }

      if (landing) {
        setLandingContent(landing)
        setLandingFormData({
          heroTitle: landing.heroTitle,
          heroSubtitle: landing.heroSubtitle,
          definitionTitle: landing.definitionTitle,
          definitionContent: landing.definitionContent,
          legalBaseTitle: landing.legalBaseTitle,
          legalBaseContent: landing.legalBaseContent,
        })
      }
    } catch (error) {
      toast({
        title: 'Klaida',
        description: 'Nepavyko įkelti duomenų',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOrgUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await updateBranduolysOrg({
        name: orgFormData.name,
        description: orgFormData.description,
      } as any)

      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: 'Branduolys organizacija atnaujinta',
        })
        // Reload data to show updated content
        await loadData()
        router.refresh()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update organization',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update organization',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLandingUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await updateLandingPageContent(landingFormData)

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Landing page content updated',
        })
        // Reload data to show updated content
        await loadData()
        router.refresh()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update content',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update content',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Branduolys valdymas
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Valdyti Branduolys organizaciją ir svetainės turinį
        </p>
      </div>

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="organization" className="data-[state=active]:bg-slate-800">
            <Building2 className="h-4 w-4 mr-2" />
            Organizacija
          </TabsTrigger>
          <TabsTrigger value="website" className="data-[state=active]:bg-slate-800">
            <Globe className="h-4 w-4 mr-2" />
            Svetainės turinys
          </TabsTrigger>
        </TabsList>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100">Branduolys organizacija</CardTitle>
              <p className="text-sm text-slate-400 mt-1">
                Valdyti Branduolys organizacijos informaciją
              </p>
            </CardHeader>
            <CardContent>
              {orgData && (
                <form onSubmit={handleOrgUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-name" className="text-slate-300">
                      Organizacijos pavadinimas
                    </Label>
                    <Input
                      id="org-name"
                      value={orgFormData.name}
                      onChange={(e) =>
                        setOrgFormData({ ...orgFormData, name: e.target.value })
                      }
                      required
                      className="bg-slate-800 border-slate-700 text-slate-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="org-description" className="text-slate-300">
                      Aprašymas
                    </Label>
                    <Textarea
                      id="org-description"
                      value={orgFormData.description}
                      onChange={(e) =>
                        setOrgFormData({ ...orgFormData, description: e.target.value })
                      }
                      rows={4}
                      className="bg-slate-800 border-slate-700 text-slate-100"
                    />
                  </div>

                  <div className="text-xs text-slate-500">
                    <p>Slug: {orgData.slug}</p>
                    <p>Status: {orgData.status || 'ACTIVE'}</p>
                    <p>Created: {orgData.created_at ? new Date(orgData.created_at).toISOString().split('T')[0] : '-'}</p>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {loading ? (
                      'Išsaugoma...'
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Išsaugoti pakeitimus
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Website Content Tab */}
        <TabsContent value="website" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100">Landing Page Content</CardTitle>
              <p className="text-sm text-slate-400 mt-1">
                Manage content displayed on the main landing page
              </p>
            </CardHeader>
            <CardContent>
              {landingContent && (
                <form onSubmit={handleLandingUpdate} className="space-y-6">
                  {/* Hero Section */}
                  <div className="space-y-4 border-b border-slate-800 pb-6">
                    <h3 className="text-lg font-semibold text-slate-200">Hero Section</h3>
                    <div className="space-y-2">
                      <Label htmlFor="hero-title" className="text-slate-300">
                        Hero Title
                      </Label>
                      <Input
                        id="hero-title"
                        value={landingFormData.heroTitle}
                        onChange={(e) =>
                          setLandingFormData({
                            ...landingFormData,
                            heroTitle: e.target.value,
                          })
                        }
                        required
                        className="bg-slate-800 border-slate-700 text-slate-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hero-subtitle" className="text-slate-300">
                        Hero Subtitle
                      </Label>
                      <Input
                        id="hero-subtitle"
                        value={landingFormData.heroSubtitle}
                        onChange={(e) =>
                          setLandingFormData({
                            ...landingFormData,
                            heroSubtitle: e.target.value,
                          })
                        }
                        className="bg-slate-800 border-slate-700 text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Definition Section */}
                  <div className="space-y-4 border-b border-slate-800 pb-6">
                    <h3 className="text-lg font-semibold text-slate-200">
                      Definition Section
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="definition-title" className="text-slate-300">
                        Title
                      </Label>
                      <Input
                        id="definition-title"
                        value={landingFormData.definitionTitle}
                        onChange={(e) =>
                          setLandingFormData({
                            ...landingFormData,
                            definitionTitle: e.target.value,
                          })
                        }
                        className="bg-slate-800 border-slate-700 text-slate-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="definition-content" className="text-slate-300">
                        Content
                      </Label>
                      <Textarea
                        id="definition-content"
                        value={landingFormData.definitionContent}
                        onChange={(e) =>
                          setLandingFormData({
                            ...landingFormData,
                            definitionContent: e.target.value,
                          })
                        }
                        rows={6}
                        className="bg-slate-800 border-slate-700 text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Legal Base Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-200">Legal Base Section</h3>
                    <div className="space-y-2">
                      <Label htmlFor="legal-title" className="text-slate-300">
                        Title
                      </Label>
                      <Input
                        id="legal-title"
                        value={landingFormData.legalBaseTitle}
                        onChange={(e) =>
                          setLandingFormData({
                            ...landingFormData,
                            legalBaseTitle: e.target.value,
                          })
                        }
                        className="bg-slate-800 border-slate-700 text-slate-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="legal-content" className="text-slate-300">
                        Content
                      </Label>
                      <Textarea
                        id="legal-content"
                        value={landingFormData.legalBaseContent}
                        onChange={(e) =>
                          setLandingFormData({
                            ...landingFormData,
                            legalBaseContent: e.target.value,
                          })
                        }
                        rows={6}
                        className="bg-slate-800 border-slate-700 text-slate-100"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                  >
                    {loading ? (
                      'Saving...'
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Landing Page Content
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

