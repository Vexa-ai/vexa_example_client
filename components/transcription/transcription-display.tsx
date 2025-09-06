"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2, Clock, History, Globe, Search, Timer } from "lucide-react"
import {
  type TranscriptionData,
  type TranscriptionSegment,
  stopTranscription,
  updateTranscriptionLanguage,
  startWebSocketTranscription,
  stopWebSocketTranscription,
  getWebSocketStatus,
} from "@/lib/transcription-service"
import { useEffect, useRef, useState, useCallback, useMemo } from "react"
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
  const [allSegments, setAllSegments] = useState<TranscriptionSegment[]>([])
  const [mutableSegmentIds, setMutableSegmentIds] = useState<Set<string>>(new Set())
  const [highlightedSegmentId, setHighlightedSegmentId] = useState<string | null>(null)
  const [newMutableSegmentIds, setNewMutableSegmentIds] = useState<Set<string>>(new Set())
  const [selectedLanguage, setSelectedLanguage] = useState<string>("auto")
  const [isChangingLanguage, setIsChangingLanguage] = useState(false)
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false)
  const [wsError, setWsError] = useState<string | null>(null)
  const userHasSelectedLanguage = useRef(false)
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)
  const transcriptionRef = useRef<HTMLDivElement>(null)
  const segmentRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const retryCount = useRef(0)
  const MAX_RETRIES = 3
  const internalMeetingId = useRef<string | number | null>(null)

  const shouldDisplay = !!meetingId

  // Text cleaner similar to Python script
  const cleanText = useCallback((text: string | undefined | null): string => {
    if (!text) return ""
    const trimmed = text.trim()
    // Collapse multiple whitespace to a single space
    return trimmed.replace(/\s+/g, ' ')
  }, [])

  // Key generator using absolute UTC time when available
  const getAbsKey = useCallback((segment: any): string => {
    return segment.absolute_start_time || segment.timestamp || segment.created_at || `no-utc-${segment.id || ''}`
  }, [])

  // Comparator: strict absolute UTC ordering, non-UTC go last
  const compareByAbsoluteUtc = useCallback((a: any, b: any): number => {
    const aUtc = a.absolute_start_time || a.timestamp
    const bUtc = b.absolute_start_time || b.timestamp
    const aHasUtc = !!a.absolute_start_time
    const bHasUtc = !!b.absolute_start_time
    if (aHasUtc && !bHasUtc) return -1
    if (!aHasUtc && bHasUtc) return 1
    const at = new Date(aUtc).getTime()
    const bt = new Date(bUtc).getTime()
    return at - bt
  }, [])

  // Merge utility: key by absolute_start_time; prefer newer updated_at
  const mergeByAbsoluteUtc = useCallback((prev: TranscriptionSegment[], incoming: TranscriptionSegment[]): TranscriptionSegment[] => {
    const map = new Map<string, TranscriptionSegment>()

    // Seed with previous segments
    for (const s of prev) {
      const key = getAbsKey(s)
      if (key.startsWith('no-utc-')) continue
      // Ensure cleaned text
      const cleaned = { ...s, text: cleanText((s as any).text) }
      map.set(key, cleaned)
    }

    // Apply incoming updates (only with absolute_start_time like Python script)
    for (const s of incoming) {
      if (!(s as any).absolute_start_time) continue
      const key = getAbsKey(s)
      if (key.startsWith('no-utc-')) continue
      const existing = map.get(key) as any
      const candidate: any = { ...s, text: cleanText((s as any).text) }
      if (existing && existing.updated_at && candidate.updated_at) {
        if (candidate.updated_at < existing.updated_at) {
          continue
        }
      }
      map.set(key, candidate)
    }

    return Array.from(map.values()).sort(compareByAbsoluteUtc)
  }, [cleanText, compareByAbsoluteUtc, getAbsKey])

  // Group consecutive segments by speaker and combine text (Python script style)
  const groupSegmentsBySpeaker = useCallback((segments: TranscriptionSegment[]) => {
    if (!segments || segments.length === 0) return [] as Array<{
      speaker: string
      startTime: string
      endTime: string
      combinedText: string
      segments: TranscriptionSegment[]
      isMutable: boolean
      isHighlighted: boolean
    }>

    const sorted = [...segments].sort(compareByAbsoluteUtc)
    const groups: Array<{
      speaker: string
      startTime: string
      endTime: string
      combinedText: string
      segments: TranscriptionSegment[]
      isMutable: boolean
      isHighlighted: boolean
    }> = []

    let current: {
      speaker: string
      startTime: string
      endTime: string
      combinedText: string
      segments: TranscriptionSegment[]
      isMutable: boolean
      isHighlighted: boolean
    } | null = null

    for (const seg of sorted) {
      const speaker = (seg as any).speaker || 'Unknown Speaker'
      const text = cleanText((seg as any).text)
      const startTime = (seg as any).absolute_start_time || seg.timestamp
      const endTime = (seg as any).absolute_end_time || seg.timestamp
      const segKey = getAbsKey(seg)
      const segIsMutable = mutableSegmentIds.has(segKey)
      const segIsHighlighted = newMutableSegmentIds.has(segKey)

      if (!text) continue

      if (current && current.speaker === speaker) {
        current.combinedText += ' ' + text
        current.endTime = endTime
        current.segments.push(seg)
        current.isMutable = current.isMutable || segIsMutable
        current.isHighlighted = current.isHighlighted || segIsHighlighted
      } else {
        if (current) groups.push(current)
        current = {
          speaker,
          startTime,
          endTime,
          combinedText: text,
          segments: [seg],
          isMutable: segIsMutable,
          isHighlighted: segIsHighlighted
        }
      }
    }

    if (current) groups.push(current)
    return groups
  }, [cleanText, compareByAbsoluteUtc, getAbsKey, mutableSegmentIds, newMutableSegmentIds])

  const formatUtcTime = useCallback((utc: string): string => {
    try {
      const dt = new Date(utc)
      return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      return utc
    }
  }, [])

  // Build a stable deduplication key across REST and WS sources
  const getSegmentKey = useCallback((segment: any): string => {
    // Use absolute_start_time if available (from REST API), otherwise fallback to timestamp
    const timestamp = segment.absolute_start_time || segment.timestamp || segment.created_at
    const text = (segment.text || "").trim()
    const speaker = segment.speaker || ''

    // Create a stable key using timestamp + speaker + text prefix
    return `${timestamp}|${speaker}|${text.slice(0, 50)}`
  }, [])

  // WebSocket callback functions
  const handleWebSocketTranscriptMutable = useCallback((newSegments: TranscriptionSegment[]) => {
    console.log("🟢 [WEBSOCKET MUTABLE] === MUTABLE SEGMENTS RECEIVED ===");
    console.log("🟢 [WEBSOCKET MUTABLE] Received mutable transcript segments:", newSegments.length);
    
    // Filter segments with text and absolute UTC only (mirror Python script)
    const validSegments = newSegments
      .filter(segment => segment.text && segment.text.trim().length > 0)
      .filter(segment => (segment as any).absolute_start_time)
      .map(s => ({ ...s, text: cleanText((s as any).text) }))
    console.log("🟢 [WEBSOCKET MUTABLE] Valid segments (with absolute UTC):", validSegments.length);
    
    if (validSegments.length === 0) {
      console.warn("🟢 [WEBSOCKET MUTABLE] All segments are empty, clearing mutable segments");
      setMutableSegmentIds(new Set());
      setNewMutableSegmentIds(new Set());
      return;
    }
    
    // Stop polling if we're receiving WebSocket data
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
      console.log("🔄 [POLLING] Stopped polling - WebSocket is receiving data");
    }
    
    // Merge by absolute UTC key with updated_at preference
    setAllSegments(prev => mergeByAbsoluteUtc(prev, validSegments))
    
    // Track which segments are mutable and highlight them
    const mutableIds = new Set(validSegments.map(s => getAbsKey(s)));
    setMutableSegmentIds(mutableIds);
    setNewMutableSegmentIds(mutableIds); // Highlight mutable segments
  }, [cleanText, getAbsKey, mergeByAbsoluteUtc]);

  const handleWebSocketTranscriptFinalized = useCallback((newSegments: TranscriptionSegment[]) => {
    console.log("🔵 [WEBSOCKET FINALIZED] === FINALIZED SEGMENTS RECEIVED ===");
    console.log("🔵 [WEBSOCKET FINALIZED] Received finalized transcript segments:", newSegments.length);
    
    // Filter finalized segments that have absolute UTC time
    const validSegments = newSegments
      .filter(segment => segment.text && segment.text.trim().length > 0)
      .filter(segment => (segment as any).absolute_start_time)
      .map(s => ({ ...s, text: cleanText((s as any).text) }))
    console.log("🔵 [WEBSOCKET FINALIZED] Valid segments (with absolute UTC):", validSegments.length);
    
    if (validSegments.length === 0) {
      console.warn("🔵 [WEBSOCKET FINALIZED] All segments are empty, skipping update");
      return;
    }
    
    // Stop polling if we're receiving WebSocket data
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
      console.log("🔄 [POLLING] Stopped polling - WebSocket is receiving data");
    }
    
    setAllSegments(prev => mergeByAbsoluteUtc(prev, validSegments))
    
    // Remove finalized segments from mutable tracking (no longer mutable)
    setMutableSegmentIds(prevMutable => {
      const finalizedIds = new Set(validSegments.map(s => getAbsKey(s)));
      const newMutable = new Set([...prevMutable].filter(id => !finalizedIds.has(id)));
      console.log("🔵 [WEBSOCKET FINALIZED] Removed", prevMutable.size - newMutable.size, "segments from mutable tracking");
      return newMutable;
    });
    
    // Clear highlights from finalized segments
    setNewMutableSegmentIds(prevHighlighted => {
      const finalizedIds = new Set(validSegments.map(s => getAbsKey(s)));
      const newHighlighted = new Set([...prevHighlighted].filter(id => !finalizedIds.has(id)));
      return newHighlighted;
    });
  }, [cleanText, getAbsKey, mergeByAbsoluteUtc]);

  const [meetingStatus, setMeetingStatus] = useState<string | null>(isLive ? "connecting" : null);

  const handleWebSocketMeetingStatus = useCallback((status: string) => {
    console.log("🟡 [WEBSOCKET] Meeting status changed to:", status);
    setMeetingStatus(status);
    console.log("🟡 [DEBUG] Meeting status updated in state to:", status);

    // Emit custom event to notify sidebar of status change
    const meetingStatusEvent = new CustomEvent('meetingStatusChange', {
      detail: {
        meetingId: meetingId,
        status: status,
        timestamp: new Date().toISOString()
      }
    });
    console.log("📡 [TRANSCRIPTION] Emitting meeting status change event:", meetingId, status);
    window.dispatchEvent(meetingStatusEvent);

    if (status !== "active") {
      // Stop WebSocket when meeting is no longer active
      if (internalMeetingId.current) {
        stopWebSocketTranscription(internalMeetingId.current);
        setIsWebSocketConnected(false);
      }
    }
  }, [meetingId]);

  const handleWebSocketError = useCallback((error: string) => {
    console.error("🔴 [WEBSOCKET ERROR]:", error);
    setWsError(error);
    setIsWebSocketConnected(false);
  }, []);

  const handleWebSocketConnected = useCallback(() => {
    console.log("✅ [WEBSOCKET] === WEBSOCKET CONNECTED SUCCESSFULLY! ===");
    setIsWebSocketConnected(true);
    setWsError(null);
    setMeetingStatus("connected");

    // Stop polling once WebSocket is connected
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
      console.log("🔄 [POLLING] Stopped polling - WebSocket is now active");
    }
  }, []);

  const handleWebSocketDisconnected = useCallback(() => {
    console.log("❌ [WEBSOCKET] Disconnected");
    setIsWebSocketConnected(false);
    // No polling fallback per Python script parity
  }, [isLive]);

  // Clear highlight effect after a delay (only for mutable segments)
  useEffect(() => {
    if (newMutableSegmentIds.size > 0) {
      const timer = setTimeout(() => {
        setNewMutableSegmentIds(new Set());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [newMutableSegmentIds]);

  // Function to poll for transcription updates in live mode
  // Removed polling path per Python script parity

  // Function to fetch historical transcripts (non-polling)
  // Removed REST-only historical path per Python script parity

  // Hybrid approach: API for initial load + WebSocket for real-time updates
  useEffect(() => {
    console.log("🔄 [USEEFFECT] TranscriptionDisplay useEffect triggered with:", {
      meetingId,
      shouldDisplay,
      isLive,
      currentMeetingStatus: meetingStatus
    });

    // Clean up any existing WebSocket connections
    if (internalMeetingId.current) {
      stopWebSocketTranscription(internalMeetingId.current);
      internalMeetingId.current = null;
    }
    
    // Reset state when meeting ID changes
    setAllSegments([])
    setMutableSegmentIds(new Set())
    setNewMutableSegmentIds(new Set())
    setTranscription(null)
    setError(null)
    setWsError(null)
    setSelectedLanguage("auto")
    setIsWebSocketConnected(false)
    setMeetingStatus(null)
    userHasSelectedLanguage.current = false
    
    if (shouldDisplay && meetingId) {
      // Subscribe to WebSocket immediately upon meeting request
      const initializeWs = async () => {
        try {
          setIsLoading(true)

          // Subscribe by native meeting id (platform/native_id) to mirror script
          const parts = meetingId.split('/')
          const platform = parts[0] || 'google_meet'
          const nativeId = parts[1] || meetingId

          // Start WS – subscribe immediately upon request
          await startWebSocketTranscription(
            { platform, native_id: nativeId } as any,
            handleWebSocketTranscriptMutable,
            handleWebSocketTranscriptFinalized,
            handleWebSocketMeetingStatus,
            handleWebSocketError,
            handleWebSocketConnected,
            handleWebSocketDisconnected
          )
          internalMeetingId.current = `${platform}/${nativeId}`

          console.log("🟢 [WEBSOCKET] Subscribed to meeting immediately upon request:", `${platform}/${nativeId}`)
        } catch (err) {
          console.error("Error initializing websocket:", err)
          setError("Failed to start WebSocket")
        } finally {
          setIsLoading(false)
        }
      }
      initializeWs()
    }

    // Clean up interval and WebSocket when component unmounts
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
        console.log("Cleaned up polling interval on unmount");
      }
      
      if (internalMeetingId.current) {
        stopWebSocketTranscription(internalMeetingId.current);
        console.log("Cleaned up WebSocket connection on unmount");
      }
    }
  }, [shouldDisplay, meetingId, isLive, handleWebSocketTranscriptMutable, handleWebSocketTranscriptFinalized, handleWebSocketMeetingStatus, handleWebSocketError, handleWebSocketConnected, handleWebSocketDisconnected])

  // Scroll to bottom when new segments are added
  useEffect(() => {
    if (transcriptionRef.current && !highlightedSegmentId && isLive) {
      transcriptionRef.current.scrollTop = transcriptionRef.current.scrollHeight
    }
  }, [allSegments, highlightedSegmentId, isLive])

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

      // Clear polling interval
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
        pollingInterval.current = null
      }

      // Stop WebSocket connection
      if (internalMeetingId.current) {
        await stopWebSocketTranscription(internalMeetingId.current);
        internalMeetingId.current = null;
        setIsWebSocketConnected(false);
      }

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
    
    // When user makes a selection, we record that.
    // If they select 'auto', we revert to auto-detection mode.
    userHasSelectedLanguage.current = language !== "auto"
    
    try {
      setIsChangingLanguage(true);
      setError(null);
      
      await updateTranscriptionLanguage(meetingId, language);
      setSelectedLanguage(language);
      
      // Clear existing segments to start fresh with the new language
      setAllSegments([]);
      setMutableSegmentIds(new Set());
      setNewMutableSegmentIds(new Set());
      
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
          {isLive && (
            <>
              {meetingStatus && (
                <div className="flex items-center gap-1">
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    meetingStatus === "active" ? "bg-green-500 animate-pulse" :
                    meetingStatus === "connected" ? "bg-green-500 animate-pulse" :
                    meetingStatus === "requested" ? "bg-blue-500 animate-pulse" :
                    meetingStatus === "connecting" ? "bg-yellow-500 animate-pulse" :
                    meetingStatus === "stopping" ? "bg-yellow-500" :
                    meetingStatus === "completed" ? "bg-gray-500" :
                    "bg-red-500"
                  )}></div>
                  <span className={cn(
                    "text-xs font-medium capitalize",
                    meetingStatus === "active" ? "text-green-600" :
                    meetingStatus === "connected" ? "text-green-600" :
                    meetingStatus === "requested" ? "text-blue-600" :
                    meetingStatus === "connecting" ? "text-yellow-600" :
                    meetingStatus === "stopping" ? "text-yellow-600" :
                    meetingStatus === "completed" ? "text-gray-600" :
                    "text-red-600"
                  )}>
                    {meetingStatus}
                  </span>
                </div>
              )}
            </>
          )}
          {!isLive && (
            <>
              <History className="h-3 w-3 text-gray-500" />
              <span className="text-xs font-medium">{title || "Meeting Transcript"}</span>
            </>
          )}

          {/* Debug info - temporarily visible */}
          <div className="text-xs text-gray-500 ml-2">
            Status: {meetingStatus || 'none'} | WS: {isWebSocketConnected ? 'connected' : 'disconnected'}
          </div>

          {/* Test button to manually trigger WebSocket callback */}
          <button
            onClick={() => {
              console.log("🧪 [TEST] Manually triggering WebSocket callback");
              const testSegments: TranscriptionSegment[] = [{
                id: `test-${Date.now()}`,
                text: "Test WebSocket segment - UI rendering test!",
                timestamp: new Date().toISOString(),
                speaker: "Test Speaker",
                language: "en"
              }];
              handleWebSocketTranscriptMutable(testSegments);
            }}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 ml-2"
          >
            Test WS
          </button>
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
              segments={allSegments}
              meetingId={meetingId}
              disabled={allSegments.length === 0 || isLoading}
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
        {allSegments.length > 0 && (
          <div className="px-3 py-1">
            <TranscriptSearch segments={allSegments} onHighlight={handleHighlightSegment} />
          </div>
        )}
        
        {error && (
          <Alert variant="destructive" className="mx-3 mt-1 py-1">
            <AlertCircle className="h-3 w-3" />
            <AlertTitle className="text-xs">Error</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {wsError && (
          <Alert variant="default" className="mx-3 mt-1 py-1 border-yellow-500 bg-yellow-50">
            <AlertCircle className="h-3 w-3 text-yellow-600" />
            <AlertTitle className="text-xs text-yellow-800">WebSocket Warning</AlertTitle>
            <AlertDescription className="text-xs text-yellow-700">{wsError}</AlertDescription>
          </Alert>
        )}

        {isLoading && !isLive && allSegments.length === 0 && (
          <div className="flex justify-center items-center flex-1">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        )}

        <div 
          ref={transcriptionRef} 
          className="flex-1 overflow-y-auto border-t border-gray-200 bg-gray-50 p-2 mt-1"
        >
          {allSegments.length === 0 && !isLoading ? (
            <div className="text-center text-gray-500 py-4">
              {isLive
                ? (meetingStatus === 'requested' ? (
                    <div className="flex flex-col items-center space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-blue-600">Requesting bot...</span>
                      </div>
                      <p className="text-xs text-gray-500 max-w-xs">
                        Your transcription bot is being requested. It will join the meeting shortly.
                      </p>
                    </div>
                  ) : (
                    <TranscriptionCountdown />
                  ))
                : "No transcript available for this meeting."
              }
            </div>
          ) : (
            <div className="space-y-1 font-light text-gray-800 pb-10">
              {groupSegmentsBySpeaker(allSegments).map((group, idx) => {
                const groupKey = `${group.speaker}-${group.startTime}-${idx}`
                // No highlighting or special styling for active/mutable segments
                return (
                  <div
                    key={groupKey}
                    ref={el => { segmentRefs.current[groupKey] = el; }}
                    className={cn(
                      "px-2 py-1 transition-colors border-l-2 hover:bg-gray-100 border-l-gray-200"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {group.speaker && group.speaker !== "Unknown" && (
                          <p className="text-xs font-semibold text-gray-600">{group.speaker}</p>
                        )}
                        <p className="text-sm leading-relaxed">{group.combinedText}</p>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-1 flex-shrink-0">
                        {formatUtcTime(group.startTime)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
