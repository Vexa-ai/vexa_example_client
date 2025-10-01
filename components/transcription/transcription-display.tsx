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
  updateTranscriptionLanguage,
  removeMeeting,
  getApiKey
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
import { Check, Send } from "lucide-react"
import { Input } from "@/components/ui/input"

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
  const [message, setMessage] = useState("")
  const [isSendingAI, setIsSendingAI] = useState(false)
  const messageInputRef = useRef<HTMLInputElement>(null)
  const [isChangingLanguage, setIsChangingLanguage] = useState(false)
  const [meetingStatus, setMeetingStatus] = useState<string | null>(null)
  const { onMeetingStatusChange, offMeetingStatusChange } = useWebSocket()
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)
  const transcriptionRef = useRef<HTMLDivElement>(null)
  const isUserAtBottomRef = useRef<boolean>(true)
  const segmentRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const retryCount = useRef(0)
  const MAX_RETRIES = 3
  const [renderCount, setRenderCount] = useState(100)
  const detailsPollingInterval = useRef<NodeJS.Timeout | null>(null)

  const shouldDisplay = !!meetingId
  
  // Debug flag - set to false in production to reduce console noise
  const DEBUG_SPEAKER_UPDATES = process.env.NODE_ENV === 'development'

  // Speaker color mapping
  const SPEAKER_COLORS = [
    'text-blue-600 bg-blue-50',
    'text-green-600 bg-green-50', 
    'text-purple-600 bg-purple-50',
    'text-orange-600 bg-orange-50',
    'text-pink-600 bg-pink-50',
    'text-indigo-600 bg-indigo-50',
    'text-red-600 bg-red-50',
    'text-yellow-600 bg-yellow-50',
    'text-teal-600 bg-teal-50',
    'text-cyan-600 bg-cyan-50',
    'text-emerald-600 bg-emerald-50',
    'text-violet-600 bg-violet-50',
    'text-rose-600 bg-rose-50',
    'text-lime-600 bg-lime-50',
    'text-amber-600 bg-amber-50',
    'text-sky-600 bg-sky-50',
    'text-fuchsia-600 bg-fuchsia-50',
    'text-slate-600 bg-slate-50',
    'text-gray-600 bg-gray-50',
    'text-zinc-600 bg-zinc-50'
  ]

  const SPECIAL_SPEAKER_COLORS: Record<string, string> = {
    'Agent': 'text-green-700 bg-green-100',
    'Unknown': 'text-gray-600 bg-gray-100'
  }

  const getSpeakerColor = (speaker: string): string => {
    if (SPECIAL_SPEAKER_COLORS[speaker]) {
      return SPECIAL_SPEAKER_COLORS[speaker]
    }
    
    // Generate consistent color based on speaker name hash
    let hash = 0
    for (let i = 0; i < speaker.length; i++) {
      const char = speaker.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    const colorIndex = Math.abs(hash) % SPEAKER_COLORS.length
    return SPEAKER_COLORS[colorIndex]
  }

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

  // Function to update speaker information in existing segments
  const updateSegmentsWithSpeakers = (apiSegments: TranscriptionSegment[]) => {
    setSegments((prevSegments) => {
      const updatedSegments = [...prevSegments]
      let hasUpdates = false
      let updateCount = 0
      let removedCount = 0

      console.log("updateSegmentsWithSpeakers - current segments:", prevSegments.length, "API segments:", apiSegments.length)

      // Create a map of API segments by start and end time for quick lookup
      const apiSegmentsMap = new Map<string, TranscriptionSegment>()
      apiSegments.forEach((segment, index) => {
        if (segment.start !== undefined) {
          const startKey = `start:${segment.start.toFixed(3)}`
          apiSegmentsMap.set(startKey, segment)
        }
        if (segment.end !== undefined) {
          const endKey = `end:${segment.end.toFixed(3)}`
          apiSegmentsMap.set(endKey, segment)
        }
        // Only log individual segments if there are few (for debugging)
        if (DEBUG_SPEAKER_UPDATES && apiSegments.length <= 20) {
          console.log(`API segment ${index}: speaker=${segment.speaker}, start=${segment.start}, end=${segment.end}`)
        }
      })
      
      // Log summary if there are many segments
      if (DEBUG_SPEAKER_UPDATES && apiSegments.length > 20) {
        console.log(`API segments: ${apiSegments.length} total, ${apiSegments.filter(s => s.speaker && s.speaker !== "Unknown").length} with speakers`)
      }

      if (DEBUG_SPEAKER_UPDATES) {
        console.log("API segments map size:", apiSegmentsMap.size)
        
        // Only log keys if there are few segments (for debugging)
        if (apiSegmentsMap.size <= 20) {
          console.log("API segments map keys:", Array.from(apiSegmentsMap.keys()))
        } else {
          console.log("API segments map keys: [too many to display, size:", apiSegmentsMap.size, "]")
        }

        // Log current segments for comparison (limited)
        console.log("Current segments count:", updatedSegments.length)
        if (updatedSegments.length <= 20) {
          console.log("Current segments:")
          updatedSegments.forEach((segment, index) => {
            if (segment.start !== undefined) {
              const key = segment.start.toFixed(3)
              console.log(`Current segment ${index}: key=${key}, speaker=${segment.speaker}, start=${segment.start}`)
            } else {
              console.log(`Current segment ${index}: NO START TIME - segment:`, segment)
            }
          })
        } else {
          console.log("Current segments: [too many to display, count:", updatedSegments.length, "]")
        }
      }

      // Update existing segments with speaker information
      for (let index = 0; index < updatedSegments.length; index++) {
        const segment = updatedSegments[index]
        
        if (segment.start === undefined) {
          console.log(`Skipping segment ${index} - no start time:`, segment)
          continue
        }
        
        // Try to find API segment by start or end time
        let apiSegment: TranscriptionSegment | undefined
        let matchType = ""
        
        if (segment.start !== undefined) {
          const startKey = `start:${segment.start.toFixed(3)}`
          apiSegment = apiSegmentsMap.get(startKey)
          if (apiSegment) matchType = "start"
        }
        
        if (!apiSegment && segment.end !== undefined) {
          const endKey = `end:${segment.end.toFixed(3)}`
          apiSegment = apiSegmentsMap.get(endKey)
          if (apiSegment) matchType = "end"
        }
        
        // Only log detailed info if there are few segments or if there's an interesting case
        if (DEBUG_SPEAKER_UPDATES && (updatedSegments.length <= 20 || apiSegment || (!segment.speaker || segment.speaker === "Unknown"))) {
          console.log(`Checking segment ${index}/${updatedSegments.length} - start:${segment.start?.toFixed(3)}, end:${segment.end?.toFixed(3)}:`, {
            currentSpeaker: segment.speaker,
            apiSpeaker: apiSegment?.speaker,
            hasApiSegment: !!apiSegment,
            matchType: matchType,
            shouldUpdate: apiSegment && apiSegment.speaker && (!segment.speaker || segment.speaker === "Unknown")
          })
        }
        
        if (apiSegment && apiSegment.speaker && (!segment.speaker || segment.speaker === "Unknown")) {
          // Only update if segment doesn't already have a speaker or has "Unknown"
          console.log(`Updating segment by ${matchType} match with speaker: ${apiSegment.speaker} (was: ${segment.speaker})`)
          updatedSegments[index] = {
            ...segment,
            speaker: apiSegment.speaker,
            // Also update timestamp if it's missing or very old
            timestamp: segment.timestamp || apiSegment.timestamp || new Date().toISOString()
          }
          hasUpdates = true
          updateCount++
        } else if (apiSegment && apiSegment.speaker) {
          console.log(`Skipping segment - already has speaker: ${segment.speaker}`)
        } else if (!apiSegment) {
          console.log(`No API segment found for start:${segment.start?.toFixed(3)} or end:${segment.end?.toFixed(3)}`)
          
          // Try to find by approximate match (within 0.1 seconds) by start OR end
          const approximateMatch = apiSegments.find(apiSeg => {
            // Check start time match
            if (apiSeg.start !== undefined && segment.start !== undefined &&
                Math.abs(apiSeg.start - segment.start) < 0.1) {
              return true
            }
            // Check end time match
            if (apiSeg.end !== undefined && segment.end !== undefined &&
                Math.abs(apiSeg.end - segment.end) < 0.1) {
              return true
            }
            return false
          })
          
          if (approximateMatch && approximateMatch.speaker && (!segment.speaker || segment.speaker === "Unknown")) {
            console.log(`Found approximate match: ${approximateMatch.start} -> ${approximateMatch.speaker}`)
            updatedSegments[index] = {
              ...segment,
              speaker: approximateMatch.speaker,
              // Also update timestamp if it's missing
              timestamp: segment.timestamp || approximateMatch.timestamp || new Date().toISOString()
            }
            hasUpdates = true
            updateCount++
          } else {
            // Check if this segment should be removed (old segment without speaker)
            const segmentAge = Date.now() - new Date(segment.timestamp).getTime()
            const isOldSegment = segmentAge > 10000 // 10 seconds
            const hasNoSpeaker = !segment.speaker || segment.speaker === "Unknown"
            
            if (isOldSegment && hasNoSpeaker) {
              console.log(`Removing old segment - age: ${Math.round(segmentAge/1000)}s, speaker: ${segment.speaker}`)
              updatedSegments.splice(index, 1)
              hasUpdates = true
              removedCount++
              // Decrement index since we removed an element
              index--
            }
          }
        }
      }

      console.log(`updateSegmentsWithSpeakers - updated ${updateCount} segments, removed ${removedCount} old segments`)
      return hasUpdates ? updatedSegments : prevSegments
    })
  }

  // Function to poll meeting details for speaker information
  const pollMeetingDetails = async () => {
    if (!meetingId || meetingStatus === "completed") {
      console.log("Skipping pollMeetingDetails - meetingId:", meetingId, "status:", meetingStatus)
      return
    }

    console.log("Polling meeting details for speaker information...")
    try {
      const data = await getTranscription(meetingId)
      console.log("Polling response - segments count:", data.segments.length)
      
      // Log segments with speakers for debugging
      const segmentsWithSpeakers = data.segments.filter(s => s.speaker && s.speaker !== "Unknown")
      console.log("Segments with speakers:", segmentsWithSpeakers.length)
      
      // Update segments with speaker information
      updateSegmentsWithSpeakers(data.segments)
      
      // Update meeting status if it changed
      if (data.status !== meetingStatus) {
        console.log("Meeting status changed:", meetingStatus, "->", data.status)
        setMeetingStatus(data.status)
        // Notify sidebar about updated meeting status
        try {
          window.dispatchEvent(new CustomEvent('vexa:meeting-updated', { detail: { meetingId, status: data.status } }))
        } catch {}
      }
    } catch (err) {
      console.error("Error polling meeting details:", err)
      // Don't show error to user, just log it
    }
  }

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
      setMeetingStatus(data.status)
      // Notify sidebar about updated meeting status/details
      try {
        if (meetingId) {
          window.dispatchEvent(new CustomEvent('vexa:meeting-updated', { detail: { meetingId, status: data.status } }))
        }
      } catch {}

      // No per-meeting subscription required; WS already connected
      setMeetingStatus(data.status)
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
      setMeetingStatus(data.status)
      // Notify sidebar about updated meeting status/details
      try {
        if (meetingId) {
          window.dispatchEvent(new CustomEvent('vexa:meeting-updated', { detail: { meetingId, status: data.status } }))
        }
      } catch {}
      
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

  // Start/stop periodic polling for meeting details (speaker information)
  useEffect(() => {
    // Clear any existing interval
    if (detailsPollingInterval.current) {
      clearInterval(detailsPollingInterval.current)
      detailsPollingInterval.current = null
    }

    // Only start polling for active meetings (including null status for initial load)
    if (shouldDisplay && isLive && meetingStatus !== "completed") {
      console.log("Starting periodic polling for meeting details (speaker info) - meetingId:", meetingId, "status:", meetingStatus)
      
      // Start polling every 5 seconds
      detailsPollingInterval.current = setInterval(() => {
        pollMeetingDetails()
      }, 10000)
      
      // Also poll immediately
      pollMeetingDetails()
    } else {
      console.log("Not starting polling - shouldDisplay:", shouldDisplay, "isLive:", isLive, "meetingStatus:", meetingStatus)
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (detailsPollingInterval.current) {
        clearInterval(detailsPollingInterval.current)
        detailsPollingInterval.current = null
      }
    }
  }, [shouldDisplay, isLive, meetingStatus, meetingId])

  // Handle WebSocket transcript updates
  useEffect(() => {
    const wsService = getWebSocketService()

    wsService.setOnTranscription((event: any) => {
      console.log("WebSocket transcription event received:", event.segments?.length || 0, "segments")
      
      const incomingSegments = (event.segments || []).map((segment: any) => {
        const startNum = typeof segment.start === 'string' ? parseFloat(segment.start) : segment.start || 0
        const endNum = typeof segment.end === 'string' ? parseFloat(segment.end) : segment.end || 0
        const id = `${startNum.toFixed(3)}`
        // Use current time if no timestamp is provided (real-time appearance)
        const timestamp = segment.absolute_start_time || segment.timestamp || new Date().toISOString()
        const processedSegment = {
          id,
          text: segment.text || "",
          timestamp,
          speaker: segment.speaker || "Unknown",
          completed: segment.completed !== undefined ? !!segment.completed : true,
          start: startNum,
          end: endNum,
          // carry numeric start for potential future ordering logic
          // @ts-ignore
          numericStart: startNum,
        }
        
        // Log processed segment for debugging
        console.log(`WebSocket processed segment ${id}:`, {
          originalStart: segment.start,
          processedStart: startNum,
          speaker: processedSegment.speaker,
          hasStart: processedSegment.start !== undefined,
          timestamp: processedSegment.timestamp,
          timestampSource: segment.absolute_start_time ? 'absolute_start_time' : segment.timestamp ? 'timestamp' : 'current_time'
        })
        
        return processedSegment
      })

      const changedIds = new Set<string>()

      setSegments((prev) => {
        // Preserve existing order; replace in place; append truly new at the end
        const next = [...prev]
        
        // Create maps for finding existing segments by start and end time
        const indexByStart = new Map<string, number>()
        const indexByEnd = new Map<string, number>()
        next.forEach((s, idx) => {
          if (s.start !== undefined) {
            indexByStart.set(s.start.toFixed(3), idx)
          }
          if (s.end !== undefined) {
            indexByEnd.set(s.end.toFixed(3), idx)
          }
        })

        for (const seg of incomingSegments) {
          // Try to find existing segment by start or end time
          let idx: number | undefined
          let matchType = ""
          
          if (seg.start !== undefined) {
            idx = indexByStart.get(seg.start.toFixed(3))
            if (idx !== undefined) matchType = "start"
          }
          
          if (idx === undefined && seg.end !== undefined) {
            idx = indexByEnd.get(seg.end.toFixed(3))
            if (idx !== undefined) matchType = "end"
          }
          
          if (idx !== undefined) {
            const existing = next[idx] as any
            // Update text and completed; treat missing completed as true
            const incomingCompleted = seg.completed !== undefined ? !!seg.completed : true
            if (existing.text !== seg.text || existing.completed !== incomingCompleted) {
              console.log(`WebSocket updating segment by ${matchType} match: ${seg.text}`)
              next[idx] = { ...existing, text: seg.text, completed: incomingCompleted }
              changedIds.add(seg.id)
            }
          } else {
            // New segment appended with all incoming fields
            console.log(`WebSocket adding new segment: ${seg.text}`)
            next.push(seg as any)
            changedIds.add(seg.id)
          }
        }
        return next
      })

      if (changedIds.size > 0) {
        console.log(`[WS] merged ${changedIds.size} segments into UI`)
        setNewSegmentIds(changedIds)
      }
    })

    const handleMeetingStatusUpdate = (meetingId: number, status: string) => {
      console.log("WebSocket meeting status:", status)
      setMeetingStatus(status)
      if (status !== "active") {
        // Do not spam errors for requested/completed; UI messaging will inform the user
        if (status === 'error') {
          setError(`Meeting status changed to: ${status}`)
        }
      } else {
        // Clear transient errors once active
        setError(null)
      }
      // Notify sidebar about updated meeting status from WS
      try {
        if (typeof window !== 'undefined' && typeof meetingId === 'string') {
          window.dispatchEvent(new CustomEvent('vexa:meeting-updated', { detail: { meetingId, status } }))
        }
      } catch {}
    }

    // Subscribe to WebSocket events
    onMeetingStatusChange(handleMeetingStatusUpdate)
    // Also listen to global updates (e.g., session_start) and update if current meeting matches
    const handleGlobalUpdate = (e: any) => {
      const { platform, nativeMeetingId, status } = e.detail || {}
      if (!meetingId || !platform || !nativeMeetingId) return
      const parts = meetingId.split('/')
      const currentPlatform = parts[0]
      const currentNative = parts[1]
      if (currentPlatform === platform && currentNative === nativeMeetingId) {
        setMeetingStatus(status)
      }
    }
    window.addEventListener('vexa:meeting-updated' as any, handleGlobalUpdate)
    
    return () => {
      offMeetingStatusChange(handleMeetingStatusUpdate)
      window.removeEventListener('vexa:meeting-updated' as any, handleGlobalUpdate)
    }
  }, [onMeetingStatusChange, offMeetingStatusChange])

  // Track whether user is at bottom; only autoscroll when at bottom
  useEffect(() => {
    const el = transcriptionRef.current
    if (!el) return

    const handleScroll = () => {
      const threshold = 16 // px tolerance
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold
      isUserAtBottomRef.current = atBottom
    }

    handleScroll()
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  // Scroll to bottom when new segments are added only if user is at bottom
  useEffect(() => {
    if (transcriptionRef.current && !highlightedSegmentId && isLive && isUserAtBottomRef.current) {
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
      // Do not update status optimistically. Wait for socket events (meeting_status/session_end).
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

  const sendAiQuery = async () => {
    if (!message.trim() || !meetingId) return
    try {
      setIsSendingAI(true)
      const [platform, nativeMeetingId] = meetingId.split('/')
      const meetingPayload = {
        id: meetingId,
        platform,
        native_meeting_id: nativeMeetingId,
        status: meetingStatus,
        title: title,
      }
      const token = getApiKey()
      const auth = typeof window !== 'undefined' ? btoa('symfa:u8Oons4ZXkcibowe') : ''
      await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: message.trim(), token, meeting: meetingPayload }),
      })
      setMessage("")
    } catch (e) {
      console.error('Failed to send Ask AI query', e)
    } finally {
      setIsSendingAI(false)
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
          {meetingStatus !== 'completed' && isLive && onStop && (
            <Button onClick={handleStop} variant="destructive" size="sm" className="h-7 text-xs py-0 px-2" disabled={isLoading}>
              {isLoading ? "Stopping..." : "Stop Bot"}
            </Button>
          )}
          {meetingStatus === 'completed' && meetingId && (
            <Button
              onClick={async () => {
                try {
                  setIsLoading(true)
                  // meetingId format: platform/native[/internal]
                  const parts = meetingId.split('/')
                  const platform = parts[0]
                  const nativeId = parts[1]
                  await removeMeeting(platform, nativeId)
                  // Notify sidebar to remove item
                  window.dispatchEvent(new CustomEvent('vexa:meeting-removed', { detail: { platform, nativeMeetingId: nativeId, meetingId } }))
                  // Navigate to new meeting/setup screen
                  window.dispatchEvent(new CustomEvent('vexa:navigate-setup'))
                  setError(null)
                } catch (e) {
                  console.error('Failed to remove meeting', e)
                  setError('Failed to remove transcription')
                } finally {
                  setIsLoading(false)
                }
              }}
              variant="destructive"
              size="sm"
              className="h-7 text-xs py-0 px-2"
              disabled={isLoading}
            >
              Remove Transcription
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
          {(!isLoading && meetingStatus === 'requested') ? (
            <div className="text-center text-gray-500 py-4">
              <TranscriptionCountdown />
            </div>
          ) : (!isLoading && meetingStatus === 'completed' && segments.length === 0) ? (
            <div className="text-center text-gray-500 py-4">
              The conversation was not recognised in this call.
            </div>
          ) : (!isLoading && meetingStatus === 'active' && segments.length === 0) ? (
            <div className="text-center text-gray-500 py-4">
              Waiting for the conversation to start...
            </div>
          ) : (segments.length === 0 && !isLoading && !isLive) ? (
            <div className="text-center text-gray-500 py-4">
              No transcript available for this meeting.
            </div>
          ) : (
            <div className="space-y-1 font-light text-gray-800 pb-2">
              {segments.length > renderCount && (
                <div className="flex justify-center py-1">
                  <Button variant="outline" size="sm" className="h-6 text-xs py-0 px-2" onClick={() => setRenderCount(c => c + 500)}>
                    Load older messages
                  </Button>
                </div>
              )}
              {(segments.length > renderCount ? segments.slice(segments.length - renderCount) : segments).map((segment) => (
                <div
                  key={segment.id}
                  ref={el => { segmentRefs.current[segment.id] = el; }}
                  className={cn(
                    "px-3 py-2 transition-colors border-l-2 border-l-gray-200 hover:bg-gray-50",
                    highlightedSegmentId === segment.id && "bg-blue-50 border-l-blue-500",
                    newSegmentIds.has(segment.id) && "bg-green-50 border-l-green-500 animate-pulse",
                    segment.completed === false && "bg-gray-100"
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {segment.speaker && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getSpeakerColor(segment.speaker)}`}>
                            {segment.speaker}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(segment.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 mt-0.5">{segment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Message input area pinned at the bottom of the card content */}
        <div className="bg-white border-t border-gray-200 p-3">
          <div className="flex items-center gap-2">
            <Input
              ref={messageInputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask AI..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendAiQuery()
                }
              }}
            />
            <Button 
              size="icon" 
              className="h-10 w-10 flex-shrink-0"
              onClick={sendAiQuery}
              disabled={!message.trim() || isSendingAI}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
