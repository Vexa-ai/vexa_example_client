"use client"

import { useState, useEffect } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle2, EyeIcon, EyeOffIcon, ExternalLink } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getApiKey, setApiKey as saveApiKeyToCookie } from "@/lib/transcription-service"

export function ApiKeyModal() {
  const [open, setOpen] = useState(false)
  const [apiKeyValue, setApiKeyValue] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")

  // Check for API key on component mount
  useEffect(() => {
    if (typeof window === 'undefined') return; // Skip on server

    // Use timeout to ensure we're on client side
    const checkApiKey = () => {
      const key = getApiKey();
      console.log("Checking for API key:", key ? "Found" : "Not found");
      
      if (!key) {
        console.log("Opening API key modal");
        setOpen(true);
      }
    };
    
    // Short delay to ensure client-side DOM is fully loaded
    const timer = setTimeout(checkApiKey, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSaveKey = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }
    
    // Reset status
    setSaveStatus("idle");
    
    // Validate input
    if (!apiKeyValue || apiKeyValue.trim().length < 5) {
      console.log("Invalid API key provided");
      setSaveStatus("error");
      return;
    }
    
    try {
      // Save the key using the imported function
      console.log("Saving API key");
      saveApiKeyToCookie(apiKeyValue.trim());
      
      // Immediately verify if the key was set
      setTimeout(() => {
        const savedKey = getApiKey();
        if (savedKey) {
          console.log("API key successfully saved");
          setSaveStatus("success");
          
          // Close modal and reload page after showing success message
          setTimeout(() => {
            setOpen(false);
            window.location.reload();
          }, 1500);
        } else {
          console.log("Failed to save API key");
          setSaveStatus("error");
        }
      }, 100);
    } catch (error) {
      console.error("Error saving API key:", error);
      setSaveStatus("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API Key Required</DialogTitle>
          <DialogDescription>
            A Vexa API key is required to use this application. Please enter your API key below.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSaveKey} className="grid gap-4 py-4">
          <div className="relative">
            <Input
              type={showKey ? "text" : "password"}
              placeholder="Enter your Vexa API key"
              value={apiKeyValue}
              onChange={(e) => setApiKeyValue(e.target.value)}
              className="pr-10"
              required
              minLength={5}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
            >
              {showKey ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
          
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertTitle>Where to get your API key</AlertTitle>
            <AlertDescription className="flex flex-col">
              <p>You can obtain your Vexa API key from the Vexa dashboard.</p>
              <a 
                href="https://vexa.ai/dashboard/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 flex items-center mt-2 w-fit"
              >
                Get API Key <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>
          
          {saveStatus === "success" && (
            <Alert variant="default" className="border-green-500">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                Your API key has been saved successfully.
              </AlertDescription>
            </Alert>
          )}
          
          {saveStatus === "error" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Please enter a valid API key.
              </AlertDescription>
            </Alert>
          )}
          
          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Continue Without Key
            </Button>
            <Button type="submit">
              Save API Key
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 