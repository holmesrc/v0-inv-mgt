"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Lock } from "lucide-react"

interface ProtectedUploadButtonProps {
  onUploadAuthorized: () => void
}

export default function ProtectedUploadButton({ onUploadAuthorized }: ProtectedUploadButtonProps) {
  const [password, setPassword] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      })

      const result = await response.json()

      if (result.success) {
        setIsOpen(false)
        setPassword("")
        onUploadAuthorized()
      } else {
        setError("Invalid password")
      }
    } catch (error) {
      setError("Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Lock className="w-4 h-4 mr-2" />
          <Upload className="w-4 h-4 mr-2" />
          Upload New File
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Protected Upload</DialogTitle>
          <DialogDescription>Enter the admin password to upload a new inventory file.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">Admin Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Authorize Upload"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
