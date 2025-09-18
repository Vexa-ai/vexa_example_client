"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { startTranscription, stopTranscription } from "@/lib/transcription-service"
import { useEffect, useState } from "react"
import { parseMeetingUrl } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface StartFormProps {
  onStart: (meetingId: string) => void
  isCollapsed: boolean
}

export function StartForm({ onStart, isCollapsed }: StartFormProps) {
  const [meetingUrl, setMeetingUrl] = useState("")
  const [language, setLanguage] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vexa_language') || 'auto'
    }
    return 'auto'
  })
  const [botName, setBotName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vexa_bot_name') || 'Vexa'
    }
    return 'Vexa'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isStoppingBot, setIsStoppingBot] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingBotInfo, setExistingBotInfo] = useState<{ platform: string; nativeMeetingId: string } | null>(null)
  const { toast } = useToast()

  // Regex to validate Google Meet URLs
  const googleMeetRegex = /^https:\/\/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})(?:\?.*)?$/;
  
  // Regex to validate Teams URLs
  const teamsRegex = /^https:\/\/teams\.live\.com\/meet\/(\d+)(\?p=([^&]+))?/;

  useEffect(() => {
    // Autofocus URL field on mount
    const el = document.getElementById('meeting-url') as HTMLInputElement | null
    if (el) el.focus()
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vexa_language', language)
    }
  }, [language])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vexa_bot_name', botName)
    }
  }, [botName])

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

  const handleStart = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }
    setError(null)
    const trimmedUrl = meetingUrl.trim();

    // Check for Google Meet URL
    const googleMeetMatch = trimmedUrl.match(googleMeetRegex);
    const teamsMatch = trimmedUrl.match(teamsRegex);

    let platform: string;
    let nativeMeetingId: string;
    let cleanUrl: string;
    let preliminaryMeetingId: string;

    if (googleMeetMatch && googleMeetMatch[1]) {
      // Google Meet URL
      platform = 'google_meet';
      nativeMeetingId = googleMeetMatch[1];
      cleanUrl = `https://meet.google.com/${nativeMeetingId}`;
      preliminaryMeetingId = `google_meet/${nativeMeetingId}`;
    } else if (teamsMatch && teamsMatch[1]) {
      // Teams URL
      platform = 'teams';
      nativeMeetingId = teamsMatch[1];
      cleanUrl = trimmedUrl; // Use the full URL for Teams
      preliminaryMeetingId = `teams/${nativeMeetingId}`;
    } else {
      setError("Invalid meeting URL. Please use a valid Google Meet (https://meet.google.com/xxx-xxxx-xxx) or Teams (https://teams.live.com/meet/...) URL.");
      return;
    }

    setIsLoading(true)

    // Navigate immediately to the meeting page
    console.log("🔄 Navigating immediately to meeting page with ID:", preliminaryMeetingId);
    onStart(preliminaryMeetingId)

    try {
      // Start the transcription in the background
      const { meetingId } = await startTranscription(cleanUrl, language, botName)
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
          platform: platform,
          nativeMeetingId: nativeMeetingId,
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
        <CardDescription>Enter a Google Meet or Teams URL to add a transcription bot to your meeting</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleStart} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="meeting-url" className="font-medium">Meeting URL</Label>
            <Input
              id="meeting-url"
              placeholder="https://meet.google.com/xxx-xxxx-xxx or https://teams.live.com/meet/..."
              value={meetingUrl}
              onChange={(e) => {
                setMeetingUrl(e.target.value)
                setError(null) // Clear error when user types
              }}
              className={error ? "border-red-500" : "focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Supports Google Meet and Microsoft Teams meetings.
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
