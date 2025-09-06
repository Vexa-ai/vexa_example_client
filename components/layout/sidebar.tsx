"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { PlusCircle, RefreshCw, Circle, CheckCircle2, AlertCircle, MoreVertical, Settings } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Meeting, getMeetingHistory } from "@/lib/transcription-service"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useWebSocket } from "@/lib/websocket-context"
import Link from "next/link"
import Image from "next/image"

interface SidebarProps {
  onNewMeeting: () => void
  onSelectMeeting: (meeting: Meeting) => void
  selectedMeetingId: string | null
}

export function Sidebar({ onNewMeeting, onSelectMeeting, selectedMeetingId }: SidebarProps) {
  const router = useRouter()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { onMeetingStatusChange, offMeetingStatusChange } = useWebSocket()

  const loadMeetings = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const fetchedMeetings = await getMeetingHistory()
      
      // Filter out meetings with "error" status
      const filteredMeetings = fetchedMeetings.filter(meeting => meeting.status !== "error")
      
      // Sort meetings by startTime (most recent first)
      const sortedMeetings = filteredMeetings
        .sort((a, b) => {
          // Fallback to id comparison if startTime is not available
          if (!a.startTime) return 1
          if (!b.startTime) return -1
          return new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        })

      console.log("Fetched meetings:", fetchedMeetings.length, "Filtered out error meetings:", fetchedMeetings.length - filteredMeetings.length)
      setMeetings(sortedMeetings)
    } catch (err) {
      console.error("Error fetching meetings:", err)
      setError("Failed to load meetings")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadMeetings()
    setIsRefreshing(false)
  }

  // Handle WebSocket meeting status updates
  const handleMeetingStatusUpdate = useCallback((meetingId: number, status: string) => {
    console.log(`Sidebar received status update: meeting ${meetingId} -> ${status}`)
    
    setMeetings(prevMeetings => {
      return prevMeetings.map(meeting => {
        // Extract internal meeting ID from the meeting.id string
        // Format: "platform/nativeMeetingId/internalId"
        const parts = meeting.id.split('/')
        const internalId = parts.length >= 3 ? parseInt(parts[2]) : null
        
        if (internalId === meetingId) {
          console.log(`Updating meeting ${meeting.id} status from ${meeting.status} to ${status}`)
          return { ...meeting, status: status as any }
        }
        return meeting
      })
    })
  }, [])

  useEffect(() => {
    loadMeetings()
  }, [])

  // Subscribe to WebSocket status updates
  useEffect(() => {
    onMeetingStatusChange(handleMeetingStatusUpdate)
    
    return () => {
      offMeetingStatusChange(handleMeetingStatusUpdate)
    }
  }, [handleMeetingStatusUpdate, onMeetingStatusChange, offMeetingStatusChange])

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case "active":
        return <Circle className="h-4 w-4 fill-green-500 text-green-500 animate-pulse" />
      case "completed":
      case "stopped":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Circle className="h-4 w-4 text-gray-300" />
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Unknown date"
    
    try {
      const date = new Date(dateString)
      // Format: "Today, 2:30 PM" or "Jan 5, 2:30 PM"
      const today = new Date()
      const isToday = date.getDate() === today.getDate() && 
                      date.getMonth() === today.getMonth() && 
                      date.getFullYear() === today.getFullYear()
      
      const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
      const time = date.toLocaleTimeString(undefined, timeOptions)
      
      if (isToday) {
        return `Today, ${time}`
      } else {
        const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
        const dateStr = date.toLocaleDateString(undefined, dateOptions)
        return `${dateStr}, ${time}`
      }
    } catch (e) {
      console.error("Error formatting date:", e)
      return dateString
    }
  }

  return (
    <div className="h-full w-full border-r border-gray-200 bg-gray-50 flex flex-col">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <Link href="https://vexa.ai" target="_blank" rel="noopener noreferrer">
            <Image src="/logodark.svg" alt="Vexa Logo" width={30} height={24} />
          </Link>
          <div className="flex items-center space-x-2">
            <Link href="https://github.com/Vexa-ai/vexa_example_client" target="_blank" rel="noopener noreferrer" title="Fork me on GitHub">
              <Image src="/icons8-github.svg" alt="GitHub Logo" width={30} height={30} />
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="h-8 w-8" title="API Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <Button onClick={onNewMeeting} variant="default" className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Meeting
          </Button>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-500">Meeting History</h3>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn(
              "h-4 w-4",
              isRefreshing && "animate-spin"
            )} />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-sm text-red-500 p-2 bg-red-50 rounded">
            {error}
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-sm text-gray-500 italic">No meetings found</div>
        ) : (
          <div className="space-y-1">
            {meetings.map((meeting) => (
              <div 
                key={meeting.id} 
                onClick={() => onSelectMeeting(meeting)}
                className={cn(
                  "flex items-center justify-between p-2 rounded-md cursor-pointer",
                  "hover:bg-gray-200 transition-colors",
                  selectedMeetingId === meeting.id && "bg-gray-200"
                )}
              >
                <div className="flex items-center space-x-2 overflow-hidden">
                  {getStatusIcon(meeting.status)}
                  <div className="truncate">
                    <div className="text-sm font-medium truncate">
                      {meeting.title || `Meeting ${meeting.nativeMeetingId || ""}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(meeting.startTime)}
                    </div>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      // Copy meeting ID to clipboard
                      navigator.clipboard.writeText(meeting.id);
                    }}>
                      Copy ID
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 