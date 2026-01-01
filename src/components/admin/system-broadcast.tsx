'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Send, MessageSquare } from 'lucide-react'
import {
  sendGlobalBroadcast,
  createGlobalAnnouncement,
  type BroadcastType,
} from '@/app/actions/admin/broadcast'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

export function SystemBroadcast() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [broadcastType, setBroadcastType] = useState<BroadcastType>(
    'SVARBUS_PRANESIMAS'
  )
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [sendAs, setSendAs] = useState<'notification' | 'announcement'>(
    'notification'
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (sendAs === 'notification') {
        const result = await sendGlobalBroadcast({
          type: broadcastType,
          title,
          message,
          priority,
        })

        if (result.success) {
          toast({
            title: 'Success',
            description: `Broadcast sent to ${result.notificationsCreated} owners`,
          })
          setTitle('')
          setMessage('')
          router.refresh()
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to send broadcast',
            variant: 'destructive',
          })
        }
      } else {
        const result = await createGlobalAnnouncement({
          type: broadcastType,
          title,
          message,
          priority,
        })

        if (result.success) {
          toast({
            title: 'Success',
            description: 'Global announcement created',
          })
          setTitle('')
          setMessage('')
          router.refresh()
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to create announcement',
            variant: 'destructive',
          })
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send broadcast',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Global Broadcast System
        </CardTitle>
        <p className="text-sm text-slate-400 mt-1">
          Communicate with all Community Chairmen at once
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Broadcast Type */}
          <div className="space-y-2">
            <Label className="text-slate-300">Broadcast Type</Label>
            <Select
              value={broadcastType}
              onValueChange={(value) => setBroadcastType(value as BroadcastType)}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                <SelectItem value="SISTEMOS_ATNAUJINIMAS">
                  Sistemos Atnaujinimas
                </SelectItem>
                <SelectItem value="SVARBUS_PRANESIMAS">
                  Svarbus Pranešimas
                </SelectItem>
                <SelectItem value="MARKETINGAS">Marketingas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Send As */}
          <div className="space-y-2">
            <Label className="text-slate-300">Send As</Label>
            <RadioGroup
              value={sendAs}
              onValueChange={(value) =>
                setSendAs(value as 'notification' | 'announcement')
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="notification" id="notification" />
                <Label htmlFor="notification" className="text-slate-300">
                  Notification (to all owners)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="announcement" id="announcement" />
                <Label htmlFor="announcement" className="text-slate-300">
                  Global Announcement (visible on all dashboards)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label className="text-slate-300">Priority</Label>
            <Select
              value={priority}
              onValueChange={(value) =>
                setPriority(value as 'low' | 'medium' | 'high')
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-slate-300">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="bg-slate-800 border-slate-700 text-slate-100"
              placeholder="Enter broadcast title"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-slate-300">
              Message
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={6}
              className="bg-slate-800 border-slate-700 text-slate-100"
              placeholder="Enter broadcast message"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading || !title || !message}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              'Sending...'
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Broadcast
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

