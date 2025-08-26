"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { getApiKey, getApiUrl } from "@/lib/transcription-service"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function ApiKeyTester() {
  const [isTesting, setIsTesting] = useState(false)
  const [result, setResult] = useState<"success" | "error" | null>(null)
  const [errorDetails, setErrorDetails] = useState("")

  const testApiKey = async () => {
    setIsTesting(true)
    setResult(null)
    setErrorDetails("")

    try {
      // Get the current API key
      const apiKey = getApiKey()
      console.log("Testing API key:", apiKey ? "Key exists" : "No key found")
      
      if (!apiKey) {
        setResult("error")
        setErrorDetails("No API key found")
        return
      }
      
      // Use the Vexa API base URL (from cookies, env, or default)
      const apiUrl = getApiUrl()
      
      // Test the API with a simple request (we'll use the /bots/status endpoint)
      const response = await fetch(`${apiUrl}/bots/status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey
        }
      })
      
      // Check the response
      console.log("API test response:", response.status)
      
      if (response.ok) {
        setResult("success")
      } else {
        const errorData = await response.json().catch(() => ({}))
        setResult("error")
        setErrorDetails(`API error: ${response.status} - ${errorData.detail || errorData.message || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error testing API key:", error)
      setResult("error")
      setErrorDetails(`Connection error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-center">
        <Button 
          onClick={testApiKey}
          disabled={isTesting}
          variant="outline"
          size="sm"
        >
          {isTesting ? "Testing..." : "Test API Key"}
        </Button>
        
        <span className="text-xs text-gray-500 ml-2">
          Directly test your API key against the Vexa API
        </span>
      </div>
      
      {result === "success" && (
        <Alert variant="default" className="mt-2 border-green-500">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle>API Key is Valid</AlertTitle>
          <AlertDescription>
            Successfully connected to the Vexa API with your API key.
          </AlertDescription>
        </Alert>
      )}
      
      {result === "error" && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>API Key Test Failed</AlertTitle>
          <AlertDescription>
            {errorDetails}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
} 