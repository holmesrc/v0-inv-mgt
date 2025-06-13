"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export default function EnvCheckPage() {
  const [envData, setEnvData] = useState<any>(null)
  const [slackConfigData, setSlackConfigData] = useState<any>(null)
  const [slackTestData, setSlackTestData] = useState<any>(null)
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

      // Check Slack configuration
      console.log("🔍 Checking Slack configuration...")
      const slackConfigResponse = await fetch("/api/debug/slack-config", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      })

      if (!slackConfigResponse.ok) {
        throw new Error(`Slack config check failed: ${slackConfigResponse.status} ${slackConfigResponse.statusText}`)
      }

      const slackConfigResult = await slackConfigResponse.json()
      setSlackConfigData(slackConfigResult)
      console.log("📊 Slack config data:", slackConfigResult)

      // Test Slack webhook if configured
      if (slackConfigResult.configured) {
        console.log("🔍 Testing Slack webhook...")
        const slackTestResponse = await fetch("/api/debug/test-slack-webhook", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
          body: JSON.stringify({
            message: "🧪 Test message from environment debug page",
          }),
        })

        if (slackTestResponse.ok) {
          const slackTestResult = await slackTestResponse.json()
          setSlackTestData(slackTestResult)
          console.log("📊 Slack test data:", slackTestResult)
        } else {
          const errorText = await slackTestResponse.text()
          setSlackTestData({
            success: false,
            error: `HTTP ${slackTestResponse.status}: ${errorText}`,
          })
        }
      }
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
          <p className="text-muted-foreground">Comprehensive environment variable and configuration check</p>
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
                  {getStatusBadge(envData.slackWebhookConfigured, "Slack Webhook")}
                  {getStatusBadge(envData.supabaseConfigured, "Supabase")}
                  {getStatusBadge(envData.environmentDetails?.hasNextPublicAppUrl, "App URL")}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Detailed Environment Check:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>SLACK_WEBHOOK_URL: {envData.environmentDetails?.hasSlackWebhook ? "✅ Set" : "❌ Missing"}</div>
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

      {/* Slack Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Slack Configuration</CardTitle>
          <CardDescription>Slack webhook configuration status</CardDescription>
        </CardHeader>
        <CardContent>
          {slackConfigData ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getStatusBadge(
                  slackConfigData.configured,
                  slackConfigData.configured ? "Configured" : "Not Configured",
                )}
              </div>
              <div>
                <strong>Message:</strong> {slackConfigData.message}
              </div>
              {slackConfigData.details && (
                <div className="space-y-1 text-sm">
                  <div>
                    <strong>Webhook URL:</strong> {slackConfigData.details.webhookUrl}
                  </div>
                  <div>
                    <strong>Environment:</strong> {slackConfigData.details.environment}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>Loading Slack configuration...</div>
          )}
        </CardContent>
      </Card>

      {/* Slack Test */}
      {slackConfigData?.configured && (
        <Card>
          <CardHeader>
            <CardTitle>Slack Webhook Test</CardTitle>
            <CardDescription>Test actual webhook functionality</CardDescription>
          </CardHeader>
          <CardContent>
            {slackTestData ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {getStatusBadge(slackTestData.success, slackTestData.success ? "Test Passed" : "Test Failed")}
                </div>
                {slackTestData.message && (
                  <div>
                    <strong>Message:</strong> {slackTestData.message}
                  </div>
                )}
                {slackTestData.error && (
                  <div className="text-red-600">
                    <strong>Error:</strong> {slackTestData.error}
                  </div>
                )}
                {slackTestData.webhookTest && (
                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>Webhook Test Success:</strong> {slackTestData.webhookTest.success ? "✅ Yes" : "❌ No"}
                    </div>
                    {slackTestData.webhookTest.error && (
                      <div className="text-red-600">
                        <strong>Webhook Error:</strong> {slackTestData.webhookTest.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>Testing Slack webhook...</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Troubleshooting Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Guide</CardTitle>
          <CardDescription>Steps to resolve common issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">If SLACK_WEBHOOK_URL is missing:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Go to Vercel Dashboard → Your Project → Settings → Environment Variables</li>
                <li>
                  Add: <code className="bg-gray-100 px-1 rounded">SLACK_WEBHOOK_URL</code> = your webhook URL
                </li>
                <li>Set environment to "Production" (and "Preview" if needed)</li>
                <li>Save the variable</li>
                <li>Go to Deployments → Redeploy the latest deployment</li>
                <li>Wait for deployment to complete, then refresh this page</li>
              </ol>
            </div>

            <div>
              <h4 className="font-medium mb-2">If webhook test fails:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Verify your Slack webhook URL is correct</li>
                <li>Test the webhook URL directly with curl or Postman</li>
                <li>Check if your Slack app has the correct permissions</li>
                <li>Ensure the webhook URL hasn't expired</li>
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
