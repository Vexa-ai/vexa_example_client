"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { PlusCircle, RefreshCw, Circle, CheckCircle2, AlertCircle, MoreVertical, Settings, Edit2, Trash2, Users, Check, X } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Meeting, getMeetingHistory, updateMeetingData, deleteMeeting } from "@/lib/transcription-service"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
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
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Memoize the change handler to prevent unnecessary re-renders
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingName(e.target.value)
  }, [])

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
      
      // If we're currently editing a meeting, preserve the editing state
      // unless the meeting no longer exists
      if (editingMeetingId && !sortedMeetings.find(m => m.id === editingMeetingId)) {
        setEditingMeetingId(null)
        setEditingName("")
      }
      
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

  useEffect(() => {
    loadMeetings()
  }, [])

  // Listen for meeting status changes and new meeting creation from TranscriptionDisplay
  useEffect(() => {
    const handleMeetingStatusChange = (event: CustomEvent) => {
      const { meetingId, status } = event.detail;
      console.log("📡 [SIDEBAR] Received meeting status change:", meetingId, status);

      // Update the meeting status in local state
      setMeetings(prevMeetings =>
        prevMeetings.map(meeting => {
          // Check if this meeting matches the status change
          // meetingId might be "google_meet/abc-def-ghi" or just the native ID
          const matchesById = meeting.id === meetingId;
          const matchesByNativeId = meeting.nativeMeetingId === meetingId;

          // Also check if meetingId contains the platform and native ID
          const parts = meetingId.split('/');
          const matchesByParts = parts.length === 2 &&
            meeting.platform?.toLowerCase().replace('_', '') === parts[0] &&
            meeting.nativeMeetingId === parts[1];

          if (matchesById || matchesByNativeId || matchesByParts) {
            console.log("📡 [SIDEBAR] Updating meeting:", meeting.id, "to status:", status);
            return { ...meeting, status: status };
          }
          return meeting;
        })
      );
    };

    const handleMeetingCreated = (event: CustomEvent) => {
      const { meetingId, platform, nativeMeetingId } = event.detail;
      console.log("📡 [SIDEBAR] New meeting created:", meetingId, platform, nativeMeetingId);

      // Refresh the meeting list to include the new meeting
      loadMeetings();
    };

    window.addEventListener('meetingStatusChange', handleMeetingStatusChange as EventListener);
    window.addEventListener('meetingCreated', handleMeetingCreated as EventListener);

    return () => {
      window.removeEventListener('meetingStatusChange', handleMeetingStatusChange as EventListener);
      window.removeEventListener('meetingCreated', handleMeetingCreated as EventListener);
    };
  }, [])

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case "active":
        return <Circle className="h-4 w-4 fill-green-500 text-green-500 animate-pulse" />
      case "requested":
        return <Circle className="h-4 w-4 fill-green-400 text-green-400 animate-pulse" />
      case "connecting":
        return <Circle className="h-4 w-4 fill-yellow-500 text-yellow-500 animate-pulse" />
      case "connected":
        return <Circle className="h-4 w-4 fill-green-500 text-green-500" />
      case "completed":
      case "stopped":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "stopping":
        return <Circle className="h-4 w-4 fill-yellow-500 text-yellow-500" />
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

  const handleEditStart = (meeting: Meeting, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingMeetingId(meeting.id)
  }

  const handleEditCancel = useCallback(() => {
    setEditingMeetingId(null)
  }, [])

  const handleEditSave = useCallback(async (newName: string) => {
    if (!editingMeetingId) return;

    setIsUpdating(true)
    try {
      await updateMeetingData(editingMeetingId, { name: newName.trim() })
      
      setMeetings(prev => prev.map(meeting => 
        meeting.id === editingMeetingId 
          ? { 
              ...meeting, 
              name: newName.trim(),
              title: newName.trim(),
              data: { ...meeting.data, name: newName.trim() }
            }
          : meeting
      ))
      
      setEditingMeetingId(null)
    } catch (err) {
      console.error("Error updating meeting:", err)
      setError("Failed to update meeting name")
    } finally {
      setIsUpdating(false)
    }
  }, [editingMeetingId])

  const handleDeleteStart = (meeting: Meeting, e: React.MouseEvent) => {
    e.stopPropagation()
    setMeetingToDelete(meeting)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!meetingToDelete) return
    
    setIsDeleting(true)
    try {
      await deleteMeeting(meetingToDelete.id)
      
      // Update the local state
      setMeetings(prev => prev.filter(meeting => meeting.id !== meetingToDelete.id))
      
      setDeleteDialogOpen(false)
      setMeetingToDelete(null)
    } catch (err) {
      console.error("Error deleting meeting:", err)
      setError("Failed to delete meeting")
    } finally {
      setIsDeleting(false)
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
                onClick={() => editingMeetingId !== meeting.id && onSelectMeeting(meeting)}
                className={cn(
                  "flex items-center justify-between p-2 rounded-md transition-colors",
                  editingMeetingId !== meeting.id && "cursor-pointer hover:bg-gray-200",
                  selectedMeetingId === meeting.id && "bg-gray-200"
                )}
              >
                <div className="flex items-center space-x-2 overflow-hidden flex-1 min-w-0">
                  {getStatusIcon(meeting.status)}
                  <div className="flex-1 min-w-0">
                    {editingMeetingId === meeting.id ? (
                      <EditingInput
                        initialName={meeting.name || meeting.title || `Meeting ${meeting.nativeMeetingId}`}
                        onSave={handleEditSave}
                        onCancel={handleEditCancel}
                        isUpdating={isUpdating}
                      />
                    ) : (
                      <>
                        <div className="text-sm font-medium truncate">
                          {meeting.name || meeting.title || `Meeting ${meeting.nativeMeetingId || ""}`}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{formatDate(meeting.startTime)}</span>
                          {meeting.participants && meeting.participants.length > 0 && (
                            <>
                              <span>•</span>
                              <div className="flex items-center space-x-1">
                                <Users className="h-3 w-3" />
                                <span>{meeting.participants.length}</span>
                              </div>
                            </>
                          )}
                        </div>
                        {meeting.participants && meeting.participants.length > 0 && (
                          <div className="text-xs text-gray-400 truncate">
                            {meeting.participants.join(", ")}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                {editingMeetingId !== meeting.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => handleEditStart(meeting, e)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Name
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => handleDeleteStart(meeting, e)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{meetingToDelete?.name || meetingToDelete?.title || 'this meeting'}"? 
              This action cannot be undone and will permanently delete the meeting and all its transcripts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 

interface EditingInputProps {
  initialName: string;
  onSave: (newName: string) => void;
  onCancel: () => void;
  isUpdating: boolean;
}

const EditingInput = ({ initialName, onSave, onCancel, isUpdating }: EditingInputProps) => {
  const [name, setName] = useState(initialName);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Set to scroll height
    }
  }, [name]); // Re-run when name changes

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Save on Enter (but not Shift+Enter for new lines)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      if (name.trim() && name.trim() !== initialName) {
        onSave(name);
      } else {
        onCancel();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    }
  };

  const handleBlur = () => {
    if (name.trim() && name.trim() !== initialName) {
      onSave(name);
    } else {
      onCancel();
    }
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleBlur();
  }

  return (
    <div className="flex items-start space-x-1 flex-1" onBlur={handleBlur}>
      <textarea
        ref={textareaRef}
        rows={1}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        className="text-sm border border-input bg-background rounded-md px-2 py-1 leading-tight resize-none overflow-hidden"
        style={{
          width: `${Math.max(120, Math.min(180, name.length * 8 + 16))}px`,
          maxWidth: '180px',
        }}
        autoFocus
        disabled={isUpdating}
      />
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        onMouseDown={handleSaveClick}
        disabled={isUpdating || !name.trim()}
      >
        <Check className="h-3 w-3" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        onMouseDown={(e) => { e.stopPropagation(); onCancel(); }}
        disabled={isUpdating}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}; 