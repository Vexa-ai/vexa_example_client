"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { startTranscription, stopTranscription } from "@/lib/transcription-service"
import { useState } from "react"
import { parseMeetingUrl } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface StartFormProps {
  onStart: (meetingId: string) => void
  isCollapsed: boolean
}

export function StartForm({ onStart, isCollapsed }: StartFormProps) {
  const [meetingUrl, setMeetingUrl] = useState("")
  const [language, setLanguage] = useState("auto")
  const [botName, setBotName] = useState("Vexa")
  const [isLoading, setIsLoading] = useState(false)
  const [isStoppingBot, setIsStoppingBot] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingBotInfo, setExistingBotInfo] = useState<{ platform: string; nativeMeetingId: string } | null>(null)
  const { toast } = useToast()

  // Regex to validate and extract Google Meet ID
  const meetUrlRegex = /^https:\/\/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})(?:\?.*)?$/;

  if (isCollapsed) {
    return null
  }

  const handleStopExistingBot = async () => {
    if (!existingBotInfo) return;
    
    try {
      setIsStoppingBot(true);
      const meetingId = `${existingBotInfo.platform}/${existingBotInfo.nativeMeetingId}`;
      await stopTranscription(meetingId);
      setExistingBotInfo(null);
      setError(null);
    } catch (err: any) {
      setError(`Failed to stop existing bot: ${err.message}`);
    } finally {
      setIsStoppingBot(false);
    }
  };

  const handleStart = async () => {
    setError(null)
    const match = meetingUrl.trim().match(meetUrlRegex);

    if (!match || !match[1]) {
      setError("Invalid Google Meet URL. Please use the format https://meet.google.com/xxx-xxxx-xxx");
      return;
    }

    // Use the extracted meeting code (match[1]) to form the clean URL or pass the code directly
    // For now, we'll assume `startTranscription` expects the full cleaned URL
    const cleanUrl = `https://meet.google.com/${match[1]}`;

    // Create a preliminary meeting ID for immediate navigation
    const preliminaryMeetingId = `google_meet/${match[1]}`;

    setIsLoading(true)

    // Navigate immediately to the meeting page
    console.log("🔄 Navigating immediately to meeting page with ID:", preliminaryMeetingId);
    onStart(preliminaryMeetingId)

    try {
      // Start the transcription in the background
      const { meetingId } = await startTranscription(cleanUrl)
      console.log("✅ Transcription started successfully with final ID:", meetingId);

      // If the returned meeting ID is different (includes internal ID), update it
      if (meetingId !== preliminaryMeetingId) {
        console.log("🔄 Updating meeting ID from preliminary to final:", meetingId);
        onStart(meetingId)
      }

      toast({
        title: "Transcription Started",
        description: `Meeting ID: ${meetingId}`,
      })

      // Emit event to refresh sidebar meeting list
      const refreshEvent = new CustomEvent('meetingCreated', {
        detail: {
          meetingId: meetingId,
          platform: 'google_meet',
          nativeMeetingId: match[1],
          timestamp: new Date().toISOString()
        }
      });
      window.dispatchEvent(refreshEvent);

    } catch (err: any) {
      console.error("Error starting transcription:", err)
      setError(err.message || "Failed to start transcription. Check API Key and URL.")
      toast({
        title: "Error",
        description: err.message || "Failed to start transcription.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full bg-white shadow-sm border border-slate-200 mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Start Transcription Bot</CardTitle>
        <CardDescription>Enter a Google Meet URL to add a transcription bot to your meeting</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleStart} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="meeting-url" className="font-medium">Google Meet URL</Label>
            <Input
              id="meeting-url"
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              value={meetingUrl}
              onChange={(e) => {
                setMeetingUrl(e.target.value)
                setError(null) // Clear error when user types
              }}
              className={error ? "border-red-500" : "focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Currently, only Google Meet is supported. Support for other platforms is coming soon.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language" className="font-medium">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language" className="focus:ring-2 focus:ring-offset-1 focus:ring-blue-500">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">None (Auto-detect)</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
                <SelectItem value="ru">Russian</SelectItem>
                <SelectItem value="pt">Portuguese</SelectItem>
                <SelectItem value="it">Italian</SelectItem>
                <SelectItem value="nl">Dutch</SelectItem>
                <SelectItem value="ko">Korean</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              If set to "None", language will be automatically detected at the beginning of the meeting.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bot-name" className="font-medium">Bot Name</Label>
            <Input
              id="bot-name"
              placeholder="Vexa"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              className="focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This is the name the bot will use when appearing in the meeting.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {existingBotInfo && (
            <div className="flex gap-3 items-center">
              <Button 
                type="button" 
                onClick={handleStopExistingBot} 
                variant="destructive"
                disabled={isStoppingBot}
              >
                {isStoppingBot ? "Stopping..." : "Stop Existing Bot"}
              </Button>
              <p className="text-sm text-muted-foreground">
                Stop the existing bot before adding a new one
              </p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 transition-colors"
            disabled={isLoading || isStoppingBot || !meetingUrl}
          >
            {isLoading ? "Starting Bot..." : "Add Bot to Meeting"}
          </Button>

          {isLoading && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Navigating to meeting page... The bot will join shortly.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
