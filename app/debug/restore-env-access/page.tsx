"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, CheckCircle, AlertTriangle, Settings, Zap } from "lucide-react"

interface RestoreResult {
  success: boolean
  message: string
  data: {
    timestamp: string
    methods: {
      processEnv: {
        available: boolean
        count: number
      }
      criticalVars: Record<string, boolean>
    }
    context: {
      nodeEnv: string
      vercelEnv: string
      platform: string
      nodeVersion: string
    }
    refreshAttempt: {
      beforeCount: number
      gcAvailable: boolean
      memoryBefore: any
    }
    afterRefresh: {
      count: number
      criticalVars: Record<string, boolean>
      memoryAfter: any
    }
    restored: boolean
    criticalVarsFound: number
  }
}

export default function RestoreEnvAccessPage() {
  const [result, setResult] = useState<RestoreResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const attemptRestore = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/debug/restore-env-access", {
        method: "POST",
        headers: { "Cache-Control": "no-cache" },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setResult(data)
      } else {
        setError(data.error || "Restoration attempt failed")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Environment Access Restoration</h1>
          <p className="text-muted-foreground">Attempt to restore environment variable access in v0 preview</p>
        </div>
        <Button onClick={attemptRestore} disabled={loading}>
          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
          {loading ? "Restoring..." : "Attempt Restoration"}
        </Button>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            How This Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p>This tool attempts to restore environment variable access by:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Taking a snapshot of current environment variable access</li>
              <li>Attempting to refresh the Node.js environment</li>
              <li>Triggering garbage collection if available</li>
              <li>Re-reading environment variables after refresh</li>
              <li>Comparing before and after states</li>
            </ul>
            <p className="text-muted-foreground">
              <strong>Note:</strong> This is a diagnostic and restoration tool. Results may vary depending on the v0
              platform's current configuration.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.data.restored ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                )}
                Restoration Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="font-medium">Status</div>
                  <Badge variant={result.data.restored ? "default" : "secondary"}>
                    {result.data.restored ? "Environment Refreshed" : "No Change Detected"}
                  </Badge>
                </div>
                <div>
                  <div className="font-medium">Variables Before/After</div>
                  <div className="text-lg">
                    {result.data.refreshAttempt.beforeCount} → {result.data.afterRefresh.count}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Critical Variables Found</div>
                  <div className="text-lg text-green-600">
                    {result.data.criticalVarsFound} / {Object.keys(result.data.afterRefresh.criticalVars).length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Critical Variables Status */}
          <Card>
            <CardHeader>
              <CardTitle>Critical Variables Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(result.data.afterRefresh.criticalVars).map(([key, found]) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded">
                    <span className="font-medium">{key}</span>
                    <Badge variant={found ? "default" : "destructive"}>{found ? "Found" : "Missing"}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Environment Context */}
          <Card>
            <CardHeader>
              <CardTitle>Environment Context</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="font-medium">NODE_ENV</div>
                  <Badge variant="outline">{result.data.context.nodeEnv}</Badge>
                </div>
                <div>
                  <div className="font-medium">VERCEL_ENV</div>
                  <Badge variant="outline">{result.data.context.vercelEnv || "Not set"}</Badge>
                </div>
                <div>
                  <div className="font-medium">Platform</div>
                  <Badge variant="outline">{result.data.context.platform}</Badge>
                </div>
                <div>
                  <div className="font-medium">Node Version</div>
                  <Badge variant="outline">{result.data.context.nodeVersion}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.data.criticalVarsFound > 0 ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Good news!</strong> {result.data.criticalVarsFound} critical environment variables are
                      accessible. You can now test your integrations:
                      <ul className="list-disc list-inside mt-2 ml-4">
                        <li>
                          <a href="/debug/env-access-test" className="text-blue-600 underline">
                            Run comprehensive environment test
                          </a>
                        </li>
                        <li>
                          <a href="/debug/slack-test" className="text-blue-600 underline">
                            Test Slack integration
                          </a>
                        </li>
                        <li>
                          <a href="/debug/supabase" className="text-blue-600 underline">
                            Test Supabase connection
                          </a>
                        </li>
                        <li>
                          <a href="/" className="text-blue-600 underline">
                            Return to main dashboard
                          </a>
                        </li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Environment variables are still not accessible.</strong> This might indicate:
                      <ul className="list-disc list-inside mt-2 ml-4">
                        <li>v0 platform configuration changes</li>
                        <li>Temporary service issues</li>
                        <li>Need to refresh the entire preview environment</li>
                      </ul>
                      <div className="mt-2">
                        <strong>Try:</strong> Refreshing the page, restarting the preview, or testing on your deployed
                        app at
                        <a
                          href="https://v0-inv-mgt.vercel.app"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline ml-1"
                        >
                          v0-inv-mgt.vercel.app
                        </a>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      {!result && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" asChild>
                <a href="/debug/env-access-test">Test Current Access</a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/debug/env-status">Check Status</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
