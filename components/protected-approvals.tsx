"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, Shield } from "lucide-react"

interface ProtectedApprovalsProps {
  children: React.ReactNode
}

export default function ProtectedApprovals({ children }: ProtectedApprovalsProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkAuthentication()
  }, [])

  const checkAuthentication = async () => {
    try {
      const response = await fetch("/api/auth/check-approval")
      const result = await response.json()

      if (result.authenticated) {
        setIsAuthenticated(true)
      } else {
        setIsOpen(true)
      }
    } catch (error) {
      setIsOpen(true)
    } finally {
      setChecking(false)
    }
  }

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
        body: JSON.stringify({ password, type: "approval" }),
      })

      const result = await response.json()

      if (result.success) {
        setIsOpen(false)
        setPassword("")
        setIsAuthenticated(true)
      } else {
        setError("Invalid password")
      }
    } catch (error) {
      setError("Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Dialog open={isOpen} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Approval Dashboard Access
              </DialogTitle>
              <DialogDescription>
                This area is restricted to authorized approvers only. Please enter the approval password to continue.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">Approval Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter approval password"
                  required
                  autoFocus
                />
              </div>
              {error && <div className="text-sm text-red-600">{error}</div>}
              <div className="flex justify-end gap-2">
                <Button type="submit" disabled={loading} className="w-full">
                  <Lock className="w-4 h-4 mr-2" />
                  {loading ? "Verifying..." : "Access Approvals"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return <>{children}</>
}
