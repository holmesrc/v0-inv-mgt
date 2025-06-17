"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export default function EnvCheckPage() {
  const [envData, setEnvData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkEnvironment = async () => {
    setLoading(true)
    setError(null)

    try {
      // Check environment variables
      console.log("🔍 Checking environment variables...")
      const envResponse = await fetch("/api/debug/env", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      })

      if (!envResponse.ok) {
        throw new Error(`Environment check failed: ${envResponse.status} ${envResponse.statusText}`)
      }

      const envResult = await envResponse.json()
      setEnvData(envResult)
      console.log("📊 Environment data:", envResult)
    } catch (error) {
      console.error("❌ Environment check failed:", error)
      setError(error instanceof Error ? error.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkEnvironment()
  }, [])

  const getStatusBadge = (success: boolean, label: string) => {
    return (
      <Badge variant={success ? "default" : "destructive"} className="flex items-center gap-1">
        {success ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
        {label}
      </Badge>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Environment Debug</h1>
          <p className="text-muted-foreground">Environment variable and configuration check</p>
        </div>
        <Button onClick={checkEnvironment} disabled={loading}>
          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          {loading ? "Checking..." : "Refresh Check"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Environment Variables */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>Server-side environment variable status</CardDescription>
        </CardHeader>
        <CardContent>
          {envData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Node Environment:</strong> {envData.nodeEnv || "unknown"}
                </div>
                <div>
                  <strong>Vercel Environment:</strong> {envData.vercelEnv || "unknown"}
                </div>
                <div>
                  <strong>Vercel URL:</strong> {envData.vercelUrl || "unknown"}
                </div>
                <div>
                  <strong>Timestamp:</strong> {new Date(envData.timestamp).toLocaleString()}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Configuration Status:</h4>
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(envData.supabaseConfigured, "Supabase")}
                  {getStatusBadge(envData.environmentDetails?.hasNextPublicAppUrl, "App URL")}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Detailed Environment Check:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>SUPABASE_URL: {envData.environmentDetails?.hasSupabaseUrl ? "✅ Set" : "❌ Missing"}</div>
                  <div>
                    SUPABASE_ANON_KEY: {envData.environmentDetails?.hasSupabaseAnonKey ? "✅ Set" : "❌ Missing"}
                  </div>
                  <div>
                    SUPABASE_SERVICE_ROLE_KEY:{" "}
                    {envData.environmentDetails?.hasSupabaseServiceKey ? "✅ Set" : "❌ Missing"}
                  </div>
                  <div>
                    NEXT_PUBLIC_APP_URL: {envData.environmentDetails?.hasNextPublicAppUrl ? "✅ Set" : "❌ Missing"}
                  </div>
                </div>
              </div>

              {envData.allEnvVars && (
                <details className="mt-4">
                  <summary className="cursor-pointer font-medium">All Environment Variables (Click to expand)</summary>
                  <div className="mt-2 p-4 bg-gray-50 rounded text-xs max-h-60 overflow-y-auto">
                    <pre>{JSON.stringify(envData.allEnvVars, null, 2)}</pre>
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div>Loading environment data...</div>
          )}
        </CardContent>
      </Card>

      {/* Troubleshooting Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Guide</CardTitle>
          <CardDescription>Steps to resolve common issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">If Supabase configuration fails:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Go to Vercel Dashboard → Your Project → Settings → Environment Variables</li>
                <li>
                  Check that you have: <code className="bg-gray-100 px-1 rounded">SUPABASE_URL</code>,{" "}
                  <code className="bg-gray-100 px-1 rounded">SUPABASE_ANON_KEY</code>, and{" "}
                  <code className="bg-gray-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code>
                </li>
                <li>Set environment to "Production" (and "Preview" if needed)</li>
                <li>Save the variables</li>
                <li>Go to Deployments → Redeploy the latest deployment</li>
                <li>Wait for deployment to complete, then refresh this page</li>
              </ol>
            </div>

            <div>
              <h4 className="font-medium mb-2">Current URL for testing:</h4>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                {typeof window !== "undefined" ? window.location.origin : "Loading..."}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
