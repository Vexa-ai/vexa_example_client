"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "./sidebar"
import { StartForm } from "@/components/transcription/start-form"
import { TranscriptionDisplay } from "@/components/transcription/transcription-display"
import { Meeting } from "@/lib/transcription-service"
import { ChevronRight, ChevronLeft, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getWebSocketService } from "@/lib/websocket-service"

interface AppLayoutProps {
  user: {
    email: string;
  }
}

export function AppLayout({ user }: AppLayoutProps) {
  // App state
  const [mode, setMode] = useState<"setup" | "live" | "history">("setup")
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null)
  const [selectedHistoricalMeeting, setSelectedHistoricalMeeting] = useState<Meeting | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleStartMeeting = (meetingId: string) => {
    setActiveMeetingId(meetingId)
    setMode("live")
    console.log("Starting live transcription with meetingId:", meetingId);

    // Ensure WebSocket service routes events only for the current meeting
    const wsService = getWebSocketService()
    // meetingId format is typically "platform/nativeMeetingId" -> use native part for WS
    const parts = meetingId.split('/')
    const nativeMeetingId = parts.length >= 2 ? parts[1] : meetingId
    wsService.setCurrentMeetingId(nativeMeetingId)
  }

  const handleStopMeeting = () => {
    setActiveMeetingId(null)
    setMode("setup")
  }

  const handleSelectHistoricalMeeting = (meeting: Meeting) => {
    // Treat selection as live immediately to avoid stale status race; WS/initial poll will drive UI state
    console.log(`Selecting meeting ${meeting.id}, forcing live mode (status=${meeting.status})`);
    setActiveMeetingId(meeting.id)
    setMode("live")

    // Save native meeting id for WebSocket filtering
    const wsService = getWebSocketService()
    console.log('[AppLayout] Setting currentMeetingId from selection:', meeting.native_meeting_id)
    wsService.setCurrentMeetingId(meeting.native_meeting_id)

    // Also keep reference for history view if needed later
    setSelectedHistoricalMeeting(meeting)
  }

  const handleNewMeeting = () => {
    setActiveMeetingId(null)
    setSelectedHistoricalMeeting(null)
    setMode("setup")
  }

  // On small screens, automatically collapse sidebar for better UX
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      }
    }

    // Initial check
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Listen for navigate-to-setup event (after removing transcription)
  useEffect(() => {
    const toSetup = () => {
      setActiveMeetingId(null)
      setSelectedHistoricalMeeting(null)
      setMode("setup")
    }
    window.addEventListener('vexa:navigate-setup' as any, toSetup)
    return () => window.removeEventListener('vexa:navigate-setup' as any, toSetup)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-white relative">
      {/* Mobile sidebar toggle button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute top-2 left-2 z-50 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Sidebar with responsive behavior */}
      <div
        className={`
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 md:opacity-100 md:w-1'}
          md:relative absolute z-40 h-screen
        `}
      >
        {sidebarOpen && (
          <Sidebar
            onNewMeeting={handleNewMeeting}
            onSelectMeeting={handleSelectHistoricalMeeting}
            selectedMeetingId={mode === "history" ? selectedHistoricalMeeting?.id || null :
                              mode === "live" ? activeMeetingId : null}
          />
        )}

        {/* Desktop sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`
            absolute top-1/2 -translate-y-1/2 hidden md:flex
            ${sidebarOpen ? 'right-0 translate-x-1/2' : 'left-0 translate-x-1/2'}
            z-30 h-8 w-8 rounded-full bg-gray-100 shadow-md border border-gray-200
          `}
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main content area that expands when sidebar is collapsed */}
      <div className={`
        flex-1 overflow-hidden flex flex-col p-2 transition-all
        ${!sidebarOpen ? 'md:pl-4' : ''}
      `}>
        <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col h-full">
          {!sidebarOpen && (
            <div className="mb-1 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="hidden md:flex h-6 text-xs py-0 px-2"
              >
                <ChevronRight className="h-3 w-3 mr-1" /> Show Sidebar
              </Button>
            </div>
          )}

          {mode === "setup" && (
            <StartForm
              onStart={handleStartMeeting}
              isCollapsed={false}
            />
          )}

          {mode === "live" && activeMeetingId && (
            <div className="flex-1 flex flex-col h-full">
              <TranscriptionDisplay
                meetingId={activeMeetingId}
                onStop={handleStopMeeting}
                isLive={true}
              />
            </div>
          )}

          {mode === "history" && selectedHistoricalMeeting && (
            <div className="flex-1 flex flex-col h-full">
              <TranscriptionDisplay
                meetingId={selectedHistoricalMeeting.id}
                isLive={false}
                title={selectedHistoricalMeeting.title || `Meeting ${selectedHistoricalMeeting.nativeMeetingId}`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
