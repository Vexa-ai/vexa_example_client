"use client"

import { useState } from "react"
import { StartForm } from "./start-form"
import { TranscriptionDisplay } from "./transcription-display"
import { ApiStatus } from "./api-status"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface TranscriptionAppProps {
  user: {
    email: string;
  }
}

export function TranscriptionApp({ user }: TranscriptionAppProps) {
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null)

  const handleStart = (meetingId: string) => {
    setActiveMeetingId(meetingId)
  }

  const handleStop = () => {
    // Keep meeting page visible after stopping the bot
    // Intentionally do not clear activeMeetingId
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="border border-slate-200">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Meeting Transcription</h1>
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                Demo Mode
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>

          <ApiStatus />

          <StartForm onStart={handleStart} isCollapsed={!!activeMeetingId} />

          <TranscriptionDisplay 
            meetingId={activeMeetingId} 
            onStop={handleStop} 
            isLive={true} 
          />
        </CardContent>
      </Card>
    </div>
  )
}
