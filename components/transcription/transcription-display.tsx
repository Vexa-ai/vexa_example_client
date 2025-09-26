"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2, Clock, History, Globe, Search, Timer } from "lucide-react"
import {
  type TranscriptionData,
  type TranscriptionSegment,
  getTranscription,
  stopTranscription,
  getMeetingTranscript,
  updateTranscriptionLanguage
} from "@/lib/transcription-service"
import { useWebSocket } from "@/lib/websocket-context"
import { getWebSocketService } from "@/lib/websocket-service"
import { useEffect, useRef, useState, useCallback } from "react"
import { DownloadTranscript } from "./download-transcript"
import { TranscriptSearch } from "./transcript-search"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check } from "lucide-react"

// Language options for the selector sorted by popularity and alphabetically in groups
const languageOptions = [
  // Most popular languages first
  { value: "auto", label: "Auto-detect" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "zh", label: "Chinese" },
  { value: "ru", label: "Russian" },
  { value: "pt", label: "Portuguese" },
  { value: "ja", label: "Japanese" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "it", label: "Italian" },
  { value: "ko", label: "Korean" },
  
  // All other supported languages alphabetically
  { value: "af", label: "Afrikaans" },
  { value: "am", label: "Armenian" },
  { value: "az", label: "Azerbaijani" },
  { value: "be", label: "Belarusian" },
  { value: "bs", label: "Bosnian" },
  { value: "bg", label: "Bulgarian" },
  { value: "ca", label: "Catalan" },
  { value: "hr", label: "Croatian" },
  { value: "cs", label: "Czech" },
  { value: "da", label: "Danish" },
  { value: "nl", label: "Dutch" },
  { value: "et", label: "Estonian" },
  { value: "fi", label: "Finnish" },
  { value: "gl", label: "Galician" },
  { value: "el", label: "Greek" },
  { value: "he", label: "Hebrew" },
  { value: "hu", label: "Hungarian" },
  { value: "is", label: "Icelandic" },
  { value: "id", label: "Indonesian" },
  { value: "kn", label: "Kannada" },
  { value: "kk", label: "Kazakh" },
  { value: "lv", label: "Latvian" },
  { value: "lt", label: "Lithuanian" },
  { value: "mk", label: "Macedonian" },
  { value: "ms", label: "Malay" },
  { value: "mr", label: "Marathi" },
  { value: "mi", label: "Maori" },
  { value: "ne", label: "Nepali" },
  { value: "no", label: "Norwegian" },
  { value: "fa", label: "Persian" },
  { value: "pl", label: "Polish" },
  { value: "ro", label: "Romanian" },
  { value: "sr", label: "Serbian" },
  { value: "sk", label: "Slovak" },
  { value: "sl", label: "Slovenian" },
  { value: "sw", label: "Swahili" },
  { value: "sv", label: "Swedish" },
  { value: "tl", label: "Tagalog" },
  { value: "ta", label: "Tamil" },
  { value: "th", label: "Thai" },
  { value: "tr", label: "Turkish" },
  { value: "uk", label: "Ukrainian" },
  { value: "ur", label: "Urdu" },
  { value: "vi", label: "Vietnamese" },
  { value: "cy", label: "Welsh" },
];

// Searchable Language Selector Component
function LanguageSelector({ 
  value, 
  onValueChange, 
  disabled 
}: { 
  value: string; 
  onValueChange: (value: string) => void; 
  disabled?: boolean 
}) {
  const [open, setOpen] = useState(false)
  
  // Find the selected language label
  const selectedLanguage = languageOptions.find(lang => lang.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-7 justify-between text-xs w-[110px] px-2 py-0 font-normal"
          disabled={disabled}
        >
          {selectedLanguage ? selectedLanguage.label : "Select language..."}
          <Globe className="ml-1 h-3 w-3 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search language..." className="h-8 text-xs" />
          <CommandList className="max-h-[200px]">
            <CommandEmpty>No language found.</CommandEmpty>
            <CommandGroup>
              {languageOptions.map((language) => (
                <CommandItem
                  key={language.value}
                  value={language.label}
                  onSelect={() => {
                    onValueChange(language.value)
                    setOpen(false)
                  }}
                  className="text-xs"
                >
                  {language.label}
                  {value === language.value && (
                    <Check className="ml-auto h-3 w-3" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Countdown component for waiting screen
function TranscriptionCountdown() {
  const [countdown, setCountdown] = useState(10);
  const [countdownComplete, setCountdownComplete] = useState(false);
  
  useEffect(() => {
    if (countdown <= 0) {
      setCountdownComplete(true);
      return;
    }
    
    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown]);
  
  return (
    <div className="text-center py-4 flex flex-col items-center space-y-2">
      {!countdownComplete ? (
        <>
          <div className="flex items-center text-blue-500 mb-1">
            <Timer className="h-5 w-5 mr-2 animate-pulse" />
            <span className="font-medium">Connecting bot to meeting</span>
          </div>
          <div className="text-gray-500">
            Please wait <span className="font-semibold text-blue-600">{countdown}</span> seconds...
          </div>
        </>
      ) : (
        <>
          <div className="text-green-600 font-medium">
            The bot is attempting to join your meeting
          </div>
          <div className="text-gray-500 text-sm mt-1">
            Please allow the bot to attend the meeting if prompted
          </div>
        </>
      )}
    </div>
  );
}

interface TranscriptionDisplayProps {
  meetingId: string | null
  onStop?: () => void
  isLive?: boolean
  title?: string
}

export function TranscriptionDisplay({ 
  meetingId, 
  onStop, 
  isLive = true,
  title
}: TranscriptionDisplayProps) {
  const [transcription, setTranscription] = useState<TranscriptionData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [segments, setSegments] = useState<TranscriptionSegment[]>([])
  const [highlightedSegmentId, setHighlightedSegmentId] = useState<string | null>(null)
  const [newSegmentIds, setNewSegmentIds] = useState<Set<string>>(new Set())
  const [selectedLanguage, setSelectedLanguage] = useState<string>("auto")
  const [isChangingLanguage, setIsChangingLanguage] = useState(false)
  const { onMeetingStatusChange, offMeetingStatusChange } = useWebSocket()
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)
  const transcriptionRef = useRef<HTMLDivElement>(null)
  const segmentRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const retryCount = useRef(0)
  const MAX_RETRIES = 3

  const shouldDisplay = !!meetingId

  // Clear highlight effect after a delay
  useEffect(() => {
    if (newSegmentIds.size > 0) {
      const timer = setTimeout(() => {
        setNewSegmentIds(new Set());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [newSegmentIds]);

  // No per-meeting subscribe/unsubscribe. Single connection; events filtered by current meeting id inside WS service.

  // Function to poll once for initial data on page load
  const pollOnceForInitialData = async () => {
    if (!meetingId) return

    setIsPolling(true)
    try {
      console.log("Polling once for initial data with meetingId:", meetingId);
      const data = await getTranscription(meetingId)
      console.log("Initial data received:", data.segments.length, "segments");

      // Set initial segments
      setSegments([...data.segments].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ));

      // Update language if detected
      if (data.language && data.language !== selectedLanguage && data.language !== "auto-detected") {
        setSelectedLanguage(data.language);
      }

      setTranscription(data)

      // No per-meeting subscription required; WS already connected
      if (data.status !== "active") {
        console.log("Meeting not active, status:", data.status);
        if (data.status === "error") {
          setError("Transcription service reported an error. Please try again.")
        }
      }
    } catch (err) {
      console.error("Error getting initial transcription data:", err)
      setError("Failed to load initial transcription data")
    } finally {
      setIsPolling(false)
    }
  }

  // Function to fetch historical transcripts (non-polling)
  const fetchHistoricalTranscript = async () => {
    if (!meetingId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await getMeetingTranscript(meetingId)
      setSegments(data.segments)
      setTranscription(data)
      
      // Update language from the historical transcript
      if (data.language && data.language !== "auto-detected") {
        setSelectedLanguage(data.language);
      }
    } catch (err) {
      console.error("Error fetching historical transcript:", err)
      setError("Failed to load transcript")
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize transcription when component mounts
  useEffect(() => {
    // Reset state when meeting ID changes
    setSegments([])
    setTranscription(null)
    setError(null)
    // Defensive: set WS current meeting id here as well (native part)
    try {
      if (meetingId) {
        const parts = meetingId.split('/')
        const nativeId = parts.length >= 2 ? parts[1] : meetingId
        getWebSocketService().setCurrentMeetingId(nativeId)
        console.log('[TranscriptionDisplay] Ensured currentMeetingId on mount/change:', nativeId)
      }
    } catch (e) {
      console.error('Failed to set currentMeetingId in TranscriptionDisplay:', e)
    }
    
    if (shouldDisplay) {
      if (isLive) {
        // Live mode: poll once for initial data, then use WebSocket if active
        console.log("Starting live transcription for meetingId:", meetingId);
        pollOnceForInitialData()
      } else {
        // Historical mode: just fetch once
        console.log("Fetching historical transcript for meetingId:", meetingId);
        fetchHistoricalTranscript()
      }
    }
  }, [shouldDisplay, meetingId, isLive])

  // Handle WebSocket transcript updates
  useEffect(() => {
    const wsService = getWebSocketService()

    wsService.setOnTranscription((event: any) => {
      const incomingSegments = (event.segments || []).map((segment: any) => {
        const id = `${segment.start}-${segment.end}`
        const timestamp = segment.absolute_start_time
          ? segment.absolute_start_time
          : new Date((segment.start || 0) * 1000).toISOString()
        return {
          id,
          text: segment.text || "",
          timestamp,
          speaker: segment.speaker || "Unknown",
        }
      })

      const changedIds = new Set<string>()

      setSegments((prev) => {
        const byId = new Map(prev.map(s => [s.id, s]))
        for (const seg of incomingSegments) {
          const existing = byId.get(seg.id)
          if (!existing || existing.text !== seg.text) {
            byId.set(seg.id, seg)
            changedIds.add(seg.id)
          }
        }
        const next = Array.from(byId.values()).sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        return next
      })

      if (changedIds.size > 0) {
        console.log(`[WS] merged ${changedIds.size} segments into UI`)
        setNewSegmentIds(changedIds)
      }
    })

    const handleMeetingStatusUpdate = (meetingId: number, status: string) => {
      console.log("WebSocket meeting status:", status)
      if (status !== "active") {
        setError(`Meeting status changed to: ${status}`)
      }
    }

    // Subscribe to WebSocket events
    onMeetingStatusChange(handleMeetingStatusUpdate)
    
    return () => {
      offMeetingStatusChange(handleMeetingStatusUpdate)
    }
  }, [onMeetingStatusChange, offMeetingStatusChange])

  // Scroll to bottom when new segments are added
  useEffect(() => {
    if (transcriptionRef.current && !highlightedSegmentId && isLive) {
      transcriptionRef.current.scrollTop = transcriptionRef.current.scrollHeight
    }
  }, [segments, highlightedSegmentId, isLive])

  // Scroll to highlighted segment
  useEffect(() => {
    if (highlightedSegmentId && segmentRefs.current[highlightedSegmentId]) {
      segmentRefs.current[highlightedSegmentId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }
  }, [highlightedSegmentId])

  const handleStop = async () => {
    if (!meetingId || !onStop) return
    try {
      setIsLoading(true)

      // No per-meeting unsubscribe required

      await stopTranscription(meetingId)
      onStop()
    } catch (err) {
      console.error("Error stopping transcription:", err)
      setError("Failed to stop transcription")
    } finally {
      setIsLoading(false)
    }
  }

  const handleHighlightSegment = (segmentId: string) => {
    setHighlightedSegmentId(segmentId)
  }

  const handleLanguageChange = async (language: string) => {
    if (!meetingId || !isLive) return;
    
    try {
      setIsChangingLanguage(true);
      setError(null);
      
      await updateTranscriptionLanguage(meetingId, language);
      setSelectedLanguage(language);
      
      // Clear existing segments to start fresh with the new language
      setSegments([]);
      
    } catch (err) {
      console.error("Error updating language:", err);
      setError("Failed to update language. Please try again.");
    } finally {
      setIsChangingLanguage(false);
    }
  }

  if (!shouldDisplay) {
    return null
  }

  // Format time for display
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="w-full border border-gray-200 shadow-sm flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between py-1 px-3 border-b">
        <div className="flex items-center gap-2">
          {isLive && isPolling && <Loader2 className="h-3 w-3 animate-spin text-gray-500" />}
          {!isLive && (
            <>
              <History className="h-3 w-3 text-gray-500" />
              <span className="text-xs font-medium">{title || "Meeting Transcript"}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isLive && (
            <div className="flex items-center mr-1">
              <LanguageSelector
                value={selectedLanguage}
                onValueChange={handleLanguageChange}
                disabled={isChangingLanguage || isLoading}
              />
            </div>
          )}
          {meetingId && (
            <DownloadTranscript
              segments={segments}
              meetingId={meetingId}
              disabled={segments.length === 0 || isLoading}
            />
          )}
          {isLive && onStop && (
            <Button onClick={handleStop} variant="destructive" size="sm" className="h-7 text-xs py-0 px-2" disabled={isLoading}>
              {isLoading ? "Stopping..." : "Stop Bot"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
        {segments.length > 0 && (
          <div className="px-3 py-1">
            <TranscriptSearch segments={segments} onHighlight={handleHighlightSegment} />
          </div>
        )}
        
        {error && (
          <Alert variant="destructive" className="mx-3 mt-1 py-1">
            <AlertCircle className="h-3 w-3" />
            <AlertTitle className="text-xs">Error</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {isLoading && !isLive && segments.length === 0 && (
          <div className="flex justify-center items-center flex-1">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        )}

        <div 
          ref={transcriptionRef} 
          className="flex-1 overflow-y-auto border-t border-gray-200 bg-gray-50 p-2 mt-1"
        >
          {segments.length === 0 && !isLoading ? (
            <div className="text-center text-gray-500 py-4">
              {isLive 
                ? <TranscriptionCountdown />
                : "No transcript available for this meeting."
              }
            </div>
          ) : (
            <div className="space-y-1 font-light text-gray-800 pb-10">
              {segments.map((segment) => (
                <div
                  key={segment.id}
                  ref={el => { segmentRefs.current[segment.id] = el; }}
                  className={cn(
                    "px-2 py-1 transition-colors border-l-2 border-l-gray-200 hover:bg-gray-100",
                    highlightedSegmentId === segment.id && "bg-gray-200 border-l-gray-500",
                    newSegmentIds.has(segment.id) && "bg-green-50 border-l-green-500 animate-pulse"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm leading-relaxed">{segment.text}</p>
                    <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-0.5 ml-1 flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      {formatTime(segment.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
