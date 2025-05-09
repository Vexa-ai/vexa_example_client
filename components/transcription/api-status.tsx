"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, InfoIcon, Settings, ExternalLink } from "lucide-react"
import { MOCK_MODE } from "@/lib/config"
import { Button } from "../ui/button"
import { getApiKey } from "@/lib/transcription-service"
import Link from "next/link"

export function ApiStatus() {
  const [apiConfigured, setApiConfigured] = useState<boolean | null>(null)
  const [apiConnected, setApiConnected] = useState<boolean | null>(null)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)

  useEffect(() => {
    // If mock mode is enabled, API is considered configured
    if (MOCK_MODE) {
      setApiConfigured(true)
      return
    }

    // Check if API configuration is available
    const apiUrl = process.env.NEXT_PUBLIC_VEXA_API_URL
    
    // Use our getApiKey function that checks cookies first
    const apiKey = typeof window !== 'undefined' ? getApiKey() : "";

    setApiConfigured(!!(apiUrl && apiKey))
  }, [])

  const testApiConnection = async () => {
    setIsTestingConnection(true)
    setTestError(null);

    try {
      // Try to get status of running bots
      const apiUrl = process.env.NEXT_PUBLIC_VEXA_API_URL
      
      // Use our getApiKey function that checks cookies first
      const apiKey = typeof window !== 'undefined' ? getApiKey() : "";
      
      const response = await fetch(`${apiUrl}/bots/status`, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey || '',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setApiConnected(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setApiConnected(false);
        setTestError(`API responded with error: ${response.status} ${response.statusText} - ${errorData.message || "Unknown error"}`);
      }
    } catch (error) {
      setApiConnected(false);
      setTestError(`Error connecting to API: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  if (apiConfigured === null) {
    return null
  }

  if (!apiConfigured) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>API Configuration Missing</AlertTitle>
        <AlertDescription className="flex flex-col space-y-2">
          <p>The Vexa API key is not configured. Please set your API key to use this application.</p>
          <div className="flex flex-wrap gap-2 mt-1">
            <Link href="/settings" passHref>
              <Button variant="outline" size="sm" className="w-fit">
                <Settings className="h-4 w-4 mr-2" />
                Go to API Key Settings
              </Button>
            </Link>
            <a 
              href="https://vexa.ai/dashboard/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="secondary" size="sm" className="w-fit">
                <ExternalLink className="h-4 w-4 mr-2" />
                Get API Key
              </Button>
            </a>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4 mb-6">
      <Alert variant="default" className="mb-2 border-green-500">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertTitle>{MOCK_MODE ? "Mock Mode Enabled" : "API Configured"}</AlertTitle>
        <AlertDescription>
          {MOCK_MODE
            ? "Using mock data for demonstration purposes."
            : "Vexa API is properly configured."}
          {!MOCK_MODE && (
            <Link href="/settings" className="block mt-2">
              <Button variant="outline" size="sm" className="w-fit">
                <Settings className="h-4 w-4 mr-2" />
                Manage API Key
              </Button>
            </Link>
          )}
        </AlertDescription>
      </Alert>

      {!MOCK_MODE && (
        <div className="flex flex-col space-y-3">
          <Button 
            onClick={testApiConnection} 
            disabled={isTestingConnection}
            className="w-fit"
            variant="outline"
          >
            {isTestingConnection ? "Testing Connection..." : "Test API Connection"}
          </Button>

          {apiConnected === true && (
            <Alert variant="default" className="border-green-500">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>Connection Successful</AlertTitle>
              <AlertDescription>
                Successfully connected to the Vexa API.
              </AlertDescription>
            </Alert>
          )}

          {apiConnected === false && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Failed</AlertTitle>
              <AlertDescription>
                {testError || "Failed to connect to the Vexa API. Please check your API key and network connection."}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}
