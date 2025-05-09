"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { setApiKey, getApiKey, clearApiKey } from "@/lib/transcription-service"
import { AlertCircle, CheckCircle2, EyeIcon, EyeOffIcon, ExternalLink } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ApiKeyTester } from "./api-key-tester"

export function ApiKeySettings() {
  const [apiKey, setApiKeyState] = useState<string>("")
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")

  // Load API key from cookies on component mount
  useEffect(() => {
    // Use a delay to ensure this only runs on client
    const timer = setTimeout(() => {
      try {
        // Access the getApiKey function that we exported
        const key = typeof window !== 'undefined' ? getApiKey() : "";
        setSavedKey(key);
        setApiKeyState(key);
      } catch (error) {
        console.error("Error loading API key:", error);
      }
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  const handleSaveKey = () => {
    try {
      setApiKey(apiKey);
      setSavedKey(apiKey);
      setSaveStatus("success");
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
    } catch (error) {
      console.error("Error saving API key:", error);
      setSaveStatus("error");
    }
  };

  const handleClearKey = () => {
    try {
      clearApiKey();
      setApiKeyState("");
      setSavedKey(null);
      setSaveStatus("success");
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
    } catch (error) {
      console.error("Error clearing API key:", error);
      setSaveStatus("error");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>API Key Settings</CardTitle>
        <CardDescription>
          Enter your Vexa API key to use this application. Your key will be stored locally in your browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex w-full items-center space-x-2">
          <div className="relative w-full">
            <Input
              type={showKey ? "text" : "password"}
              placeholder="Enter your Vexa API key"
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
            >
              {showKey ? (
                <EyeOffIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          <AlertTitle>Need an API key?</AlertTitle>
          <AlertDescription className="flex flex-col">
            <p>You can obtain your Vexa API key from the Vexa dashboard.</p>
            <a 
              href="https://vexa.ai/dashboard/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 flex items-center mt-2 w-fit"
            >
              Go to Vexa Dashboard <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </AlertDescription>
        </Alert>
        
        {saveStatus === "success" && (
          <Alert variant="default" className="border-green-500">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              Your API key has been {savedKey ? "saved" : "cleared"} successfully.
            </AlertDescription>
          </Alert>
        )}
        
        {saveStatus === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              An error occurred while {savedKey ? "saving" : "clearing"} your API key.
            </AlertDescription>
          </Alert>
        )}
        
        {savedKey && <ApiKeyTester />}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSaveKey} disabled={!apiKey || apiKey === savedKey}>
          Save Key
        </Button>
      </CardFooter>
    </Card>
  )
} 