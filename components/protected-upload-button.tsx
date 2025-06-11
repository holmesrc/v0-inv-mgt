"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FileUpload } from "@/components/file-upload"
import { useToast } from "@/components/ui/use-toast"

export function ProtectedUploadButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState("")
  const { toast } = useToast()

  const handleAuthenticate = async () => {
    setIsLoading(true)
    setAuthError("")

    try {
      const response = await fetch("/api/auth/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (data.success) {
        setIsAuthenticated(true)
        setAuthError("")
      } else {
        setAuthError(data.error || "Authentication failed")
        // Show hint if provided
        if (data.hint) {
          toast({
            title: "Authentication Hint",
            description: data.hint,
            duration: 10000,
          })
        }
      }
    } catch (error) {
      setAuthError("An error occurred during authentication")
      console.error("Authentication error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setIsAuthenticated(false)
    setPassword("")
    setAuthError("")
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline">
        Upload Excel File
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAuthenticated ? "Upload Excel File" : "Authentication Required"}</DialogTitle>
            <DialogDescription>
              {isAuthenticated
                ? "Upload an Excel file to update inventory data."
                : "Please enter the upload password to continue."}
            </DialogDescription>
          </DialogHeader>

          {!isAuthenticated ? (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAuthenticate()
                      }
                    }}
                  />
                  {authError && <p className="text-sm text-red-500">{authError}</p>}
                  {process.env.NODE_ENV !== "production" && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Hint: If the environment variable is missing, try using the fallback password.
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleAuthenticate} disabled={isLoading}>
                  {isLoading ? "Authenticating..." : "Continue"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <FileUpload onClose={handleClose} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
