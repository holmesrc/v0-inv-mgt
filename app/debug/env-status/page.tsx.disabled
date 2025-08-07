"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Info } from "lucide-react"

interface EnvStatus {
  timestamp: string
  environment: string
  vercelEnv: string
  variables: Record<
    string,
    {
      exists: boolean
      length: number
      preview: string
      [key: string]: any
    }
  >
  allRequiredPresent: boolean
  context: {
    isPreview: boolean
    isV0Preview: boolean
    deploymentUrl: string
    message: string
  }
}

export default function EnvStatusPage() {
  const [status, setStatus] = useState<EnvStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/debug/env-status")
      const result = await response.json()

      if (response.ok) {
        setStatus(result)
      } else {
        setError("Failed to load environment status")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const getStatusIcon = (exists: boolean, isValid?: boolean) => {
    if (!exists) return <XCircle className="w-4 h-4 text-red-500" />
    if (isValid === false) return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    return <CheckCircle className="w-4 h-4 text-green-500" />
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Checking environment status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="container mx-auto p-6">
        <Button onClick={loadStatus}>Check Environment Status</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Environment Status Check</h1>
          <p className="text-muted-foreground">Quick check of environment variable availability</p>
        </div>
        <Button onClick={loadStatus} disabled={loading}>
          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Context Alert */}
      <Alert variant={status.context.isV0Preview ? "default" : "default"}>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-1">
            <div>
              <strong>Environment:</strong> {status.environment}
            </div>
            <div>
              <strong>Context:</strong> {status.context.message}
            </div>
            <div>
              <strong>Deployment URL:</strong> {status.context.deploymentUrl}
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status.allRequiredPresent ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            Overall Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-lg">
            {status.allRequiredPresent ? (
              <span className="text-green-600 font-medium">✅ All required environment variables are present</span>
            ) : (
              <span className="text-red-600 font-medium">❌ Some required environment variables are missing</span>
            )}
          </div>
          {status.context.isV0Preview && (
            <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> You're in v0 preview mode. Environment variables are not available here, but they
                should work in your deployed application at{" "}
                <a href="https://v0-inv-mgt.vercel.app" target="_blank" rel="noopener noreferrer" className="underline">
                  v0-inv-mgt.vercel.app
                </a>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Variables */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>Status of each required variable</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(status.variables).map(([key, info]) => (
              <div key={key} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  {getStatusIcon(
                    info.exists,
                    info.isValidLength !== false && info.startsWithHttps !== false && info.isValidSlackUrl !== false,
                  )}
                  <div>
                    <div className="font-medium">{key}</div>
                    <div className="text-sm text-muted-foreground">{info.preview}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{info.length} chars</Badge>
                  {info.exists && (
                    <Badge
                      variant={
                        info.isValidLength !== false && info.startsWithHttps !== false && info.isValidSlackUrl !== false
                          ? "default"
                          : "destructive"
                      }
                    >
                      {info.isValidLength !== false && info.startsWithHttps !== false && info.isValidSlackUrl !== false
                        ? "Valid"
                        : "Invalid"}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <strong>To test in your deployed app:</strong>
              <ol className="list-decimal list-inside ml-4 mt-1 space-y-1">
                <li>
                  Visit{" "}
                  <a
                    href="https://v0-inv-mgt.vercel.app/debug/env-status"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    v0-inv-mgt.vercel.app/debug/env-status
                  </a>
                </li>
                <li>All variables should show as "exists: true" with proper lengths</li>
                <li>The overall status should be green ✅</li>
              </ol>
            </div>
            <div>
              <strong>If variables are missing in production:</strong>
              <ol className="list-decimal list-inside ml-4 mt-1 space-y-1">
                <li>Check your Vercel project settings → Environment Variables</li>
                <li>Ensure variables are set for the correct environment (Production/Preview/Development)</li>
                <li>Redeploy your application after adding variables</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
