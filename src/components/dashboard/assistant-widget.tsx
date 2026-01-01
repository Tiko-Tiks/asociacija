'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface AssistantWidgetProps {
  orgId: string
}

/**
 * Local Assistant Widget (AI Panel)
 * 
 * Highlight feature for the dashboard.
 * Allows users to ask questions and generate drafts.
 * 
 * Behavior:
 * - Text area for user input
 * - "Generuoti juodraštį" button
 * - Connects to AI Server Action
 */
export function AssistantWidget({ orgId }: AssistantWidgetProps) {
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  const handleGenerate = async () => {
    if (!input.trim()) {
      toast({
        title: "Prašome įvesti užklausą",
        description: "Įveskite klausimą arba užduotį vietiniam asistentui",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    try {
      // TODO: Connect to AI Server Action
      // For now, show placeholder
      await new Promise((resolve) => setTimeout(resolve, 1500))
      
      toast({
        title: "Juodraštis sugeneruotas",
        description: "Funkcionalumas bus pridėtas netrukus",
      })
      
      setInput('')
    } catch (error) {
      toast({
        title: "Klaida",
        description: "Nepavyko sugeneruoti juodraščio. Bandykite dar kartą.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="border-2 border-blue-200 bg-blue-50/30 hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-blue-600" />
          </div>
          <CardTitle className="text-lg">Vietinis Asistentas</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Kuo galiu padėti? (pvz., sukurti kvietimą į talką...)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          className="resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          disabled={isGenerating}
        />
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generuojama...
            </>
          ) : (
            'Generuoti juodraštį'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

