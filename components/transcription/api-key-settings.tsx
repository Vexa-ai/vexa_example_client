"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { setApiKey, getApiKey, clearApiKey, setApiUrl, getApiUrl, clearApiUrl } from "@/lib/transcription-service"
import { AlertCircle, CheckCircle2, EyeIcon, EyeOffIcon, ExternalLink } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ApiKeyTester } from "./api-key-tester"

export function ApiKeySettings() {
  const [apiKey, setApiKeyState] = useState<string>("")
  const [apiUrl, setApiUrlState] = useState<string>("")
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [savedUrl, setSavedUrl] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")

  // Load API key and URL from cookies on component mount
  useEffect(() => {
    // Use a delay to ensure this only runs on client
    const timer = setTimeout(() => {
      try {
        // Load API key
        const key = typeof window !== 'undefined' ? getApiKey() : "";
        setSavedKey(key);
        setApiKeyState(key);

        // Load API URL
        const url = typeof window !== 'undefined' ? getApiUrl() : "";
        setSavedUrl(url);
        setApiUrlState(url);
      } catch (error) {
        console.error("Error loading API settings:", error);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleSaveSettings = () => {
    try {
      // Save API key if provided
      if (apiKey) {
        setApiKey(apiKey);
        setSavedKey(apiKey);
      }

      // Save API URL if provided
      if (apiUrl) {
        setApiUrl(apiUrl);
        setSavedUrl(apiUrl);
      }

      setSaveStatus("success");

      // Reset status after 3 seconds
      setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
    } catch (error) {
      console.error("Error saving API settings:", error);
      setSaveStatus("error");
    }
  };

  const handleClearSettings = () => {
    try {
      clearApiKey();
      clearApiUrl();
      setApiKeyState("");
      setApiUrlState("");
      setSavedKey(null);
      setSavedUrl(null);
      setSaveStatus("success");

      // Reset status after 3 seconds
      setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
    } catch (error) {
      console.error("Error clearing API settings:", error);
      setSaveStatus("error");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>API Settings</CardTitle>
        <CardDescription>
          Configure your Vexa API settings. Your API key and URL will be stored securely in your browser's cookies.
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

        {/* API URL Input */}
        <div className="space-y-2">
          <label htmlFor="api-url" className="text-sm font-medium">
            Vexa API URL
          </label>
          <Input
            id="api-url"
            type="url"
            placeholder="https://api.cloud.vexa.ai"
            value={apiUrl}
            onChange={(e) => setApiUrlState(e.target.value)}
            className="w-full"
          />
          <p className="text-sm text-gray-500">
            Enter the Vexa API endpoint URL. Leave empty to use the default.
          </p>
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
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleClearSettings}
          disabled={!savedKey && !savedUrl}
        >
          Clear All
        </Button>
        <Button
          onClick={handleSaveSettings}
          disabled={(!apiKey || apiKey === savedKey) && (!apiUrl || apiUrl === savedUrl)}
        >
          Save Settings
        </Button>
      </CardFooter>
    </Card>
  )
} 