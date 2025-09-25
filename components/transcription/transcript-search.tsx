"use client"

import type React from "react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import type { TranscriptionSegment } from "@/lib/transcription-service"

interface TranscriptSearchProps {
  segments: TranscriptionSegment[]
  onHighlight: (segmentId: string) => void
}

export function TranscriptSearch({ segments, onHighlight }: TranscriptSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [results, setResults] = useState<{ segmentId: string; index: number }[]>([])
  const [currentResultIndex, setCurrentResultIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  // Search for the term in segments
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([])
      setCurrentResultIndex(-1)
      return
    }

    const term = searchTerm.toLowerCase()
    const newResults = segments
      .map((segment, index) => {
        if (segment.text.toLowerCase().includes(term)) {
          return { segmentId: segment.id, index }
        }
        return null
      })
      .filter((result): result is { segmentId: string; index: number } => result !== null)

    setResults(newResults)
    setCurrentResultIndex(newResults.length > 0 ? 0 : -1)

    // Highlight the first result if available
    if (newResults.length > 0) {
      onHighlight(newResults[0].segmentId)
    }
  }, [searchTerm, segments, onHighlight])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputRef.current) {
      setSearchTerm(inputRef.current.value)
    }
  }

  const handleClear = () => {
    setSearchTerm("")
    if (inputRef.current) {
      inputRef.current.value = ""
      inputRef.current.focus()
    }
  }

  const navigateResults = (direction: "next" | "prev") => {
    if (results.length === 0) return

    let newIndex = currentResultIndex
    if (direction === "next") {
      newIndex = (currentResultIndex + 1) % results.length
    } else {
      newIndex = (currentResultIndex - 1 + results.length) % results.length
    }

    setCurrentResultIndex(newIndex)
    onHighlight(results[newIndex].segmentId)
  }

  return (
    <div className="flex flex-col space-y-2">
      <form onSubmit={handleSearch} className="flex w-full items-center space-x-2">
        <div className="relative flex-1">
          <Input 
            ref={inputRef} 
            placeholder="Search transcript..." 
            defaultValue={searchTerm} 
            className="pr-8 focus:ring-2 focus:ring-ring focus:ring-offset-0" 
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button type="submit" size="sm" variant="secondary">
          <Search className="h-4 w-4 mr-1" />
          Search
        </Button>
      </form>

      {results.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span>
            {currentResultIndex + 1} of {results.length} results
          </span>
          <div className="flex space-x-1">
            <Button size="sm" variant="outline" onClick={() => navigateResults("prev")} disabled={results.length <= 1}>
              Previous
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigateResults("next")} disabled={results.length <= 1}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
