"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'
import { aiCopilotAssist, CopilotPromptType, CopilotResponse } from '@/app/actions/ai-copilot'
import { useToast } from '@/components/ui/use-toast'

interface AICopilotWidgetProps {
  orgId: string
}

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  title?: string
  timestamp: string
}

const PROMPTS: Array<{ type: CopilotPromptType; label: string; icon: string }> = [
  { type: 'AGENDA', label: 'Paruošk susirinkimo darbotvarkę', icon: '📋' },
  { type: 'ANNOUNCEMENT', label: 'Sukurk pranešimą nariams', icon: '📢' },
  { type: 'MONTHLY_TASKS', label: 'Ką reikia padaryti šį mėnesį?', icon: '✅' },
  { type: 'REPORT_PREP', label: 'Kaip pasiruošti ataskaitai?', icon: '📊' },
]

export function AICopilotWidget({ orgId }: AICopilotWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handlePrompt = async (promptType: CopilotPromptType, label: string) => {
    setIsLoading(true)

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: label,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])

    try {
      const response = await aiCopilotAssist(orgId, promptType)

      // Add assistant message
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: response.content,
        title: response.title,
        timestamp: response.timestamp,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error getting AI copilot response:', error)
      toast({
        title: 'Klaida',
        description: 'Nepavyko gauti atsakymo',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          AI kopilotas
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 p-4">
        {/* Messages Area */}
        <div className="flex-1 min-h-[300px] max-h-[400px] overflow-y-auto pr-2">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm">Pasirinkite užklausą, kad pradėtumėte</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-900'
                    }`}
                  >
                    {message.type === 'assistant' && message.title && (
                      <h4 className="font-semibold mb-2 text-sm">{message.title}</h4>
                    )}
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-lg p-3">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Prompt Buttons */}
        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-medium text-slate-600 mb-2">Greitos užklausos:</p>
          <div className="grid grid-cols-1 gap-2">
            {PROMPTS.map((prompt) => (
              <Button
                key={prompt.type}
                variant="outline"
                size="sm"
                onClick={() => handlePrompt(prompt.type, prompt.label)}
                disabled={isLoading}
                className="justify-start text-left h-auto py-2 px-3"
              >
                <span className="mr-2">{prompt.icon}</span>
                <span className="text-xs">{prompt.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

