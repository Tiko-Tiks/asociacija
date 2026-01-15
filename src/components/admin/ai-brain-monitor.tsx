'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Brain, TrendingUp, DollarSign, Zap } from 'lucide-react'
import { useState } from 'react'

export function AIBrainMonitor() {
  const [systemPrompt, setSystemPrompt] = useState('')
  const [saving, setSaving] = useState(false)

  // Mock data - in production, fetch from actual AI usage logs
  const aiStats = {
    totalRequests: 0,
    totalTokens: 0,
    estimatedCost: 0,
    topCommunities: [] as Array<{ name: string; requests: number }>,
  }

  const handleSavePrompt = async () => {
    setSaving(true)
    // TODO: Implement save to system_config table
    setTimeout(() => {
      setSaving(false)
      // toast success
    }, 1000)
  }

  return (
    <div className="space-y-6">
      {/* AI Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Viso užklausų
            </CardTitle>
            <Zap className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-100">
              {aiStats.totalRequests}
            </div>
            <p className="text-xs text-slate-500 mt-1">Viso laikotarpiu</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Viso tokenų
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-100">
              {aiStats.totalTokens.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            </div>
            <p className="text-xs text-slate-500 mt-1">Apdorota</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Numatoma kaina
            </CardTitle>
            <DollarSign className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              ${aiStats.estimatedCost.toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Viso laikotarpiu</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Communities */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Top bendruomenės pagal AI naudojimą
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aiStats.topCommunities.length === 0 ? (
            <p className="text-slate-500 text-center py-8">
              AI naudojimo duomenų dar nėra
            </p>
          ) : (
            <div className="space-y-2">
              {aiStats.topCommunities.map((community, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-slate-800 rounded-md"
                >
                  <span className="text-slate-300">{community.name}</span>
                  <span className="text-slate-400">{community.requests} užklausų</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Prompt Editor */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Sistemos prompt redagavimas
          </CardTitle>
          <p className="text-sm text-slate-400 mt-1">
            Atnaujinti sistemos prompt, naudojamą AI visoje platformoje
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="system-prompt" className="text-slate-300">
              Sistemos prompt
            </Label>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={10}
              className="bg-slate-800 border-slate-700 text-slate-100 font-mono text-sm"
              placeholder="Įveskite sistemos prompt AI..."
            />
            <p className="text-xs text-slate-500">
              Šis prompt bus naudojamas visoms AI sąveikoms visoje platformoje
            </p>
          </div>
          <Button
            onClick={handleSavePrompt}
            disabled={saving || !systemPrompt}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? 'Išsaugoma...' : 'Išsaugoti sistemos prompt'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

