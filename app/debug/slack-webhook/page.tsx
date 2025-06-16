"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Send } from "lucide-react"

export default function SlackWebhookDebugPage() {
  const [webhookUrl, setWebhookUrl] = useState("")
  const [verifyResult, setVerifyResult] = useState<any>(null)
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testMessage, setTestMessage] = useState("🧪 Test message from Slack webhook debug page")

  const verifyWebhook = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/debug/verify-slack-webhook", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      })

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      setVerifyResult(result)
      console.log("Verification result:", result)
    } catch (error) {
      console.error("Error verifying webhook:", error)
      setError(error instanceof Error ? error.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const testWebhook = async () => {
    setTestLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/debug/test-slack-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({
          message: testMessage,
          webhookUrl: webhookUrl || undefined, // Only send if not empty
        }),
      })

      if (!response.ok) {
        throw new Error(`Test failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      setTestResult(result)
      console.log("Test result:", result)
    } catch (error) {
      console.error("Error testing webhook:", error)
      setError(error instanceof Error ? error.message : "Unknown error")
    } finally {
      setTestLoading(false)
    }
  }

  useEffect(() => {
    verifyWebhook()
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
          <h1 className="text-3xl font-bold">Slack Webhook Debug</h1>
          <p className="text-muted-foreground">Diagnose and test your Slack webhook configuration</p>
        </div>
        <Button onClick={verifyWebhook} disabled={loading}>
          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          {loading ? "Verifying..." : "Verify Webhook"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Webhook Verification Results */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Verification</CardTitle>
          <CardDescription>Current server-side webhook configuration</CardDescription>
        </CardHeader>
        <CardContent>
          {verifyResult ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getStatusBadge(
                  verifyResult.configured,
                  verifyResult.configured ? "Webhook URL Configured" : "Webhook URL Not Configured",
                )}
                {verifyResult.configured &&
                  verifyResult.urlValid !== undefined &&
                  getStatusBadge(verifyResult.urlValid, verifyResult.urlValid ? "URL Valid" : "URL Invalid")}
              </div>

              {verifyResult.configured && (
                <div className="space-y-2">
                  <div>
                    <strong>Webhook URL:</strong> {verifyResult.webhookUrlStart || "Not available"}
                    {verifyResult.webhookUrlLength && ` (${verifyResult.webhookUrlLength} characters)`}
                  </div>
                  {verifyResult.status && (
                    <div>
                      <strong>Status:</strong> {verifyResult.status} {verifyResult.statusText}
                    </div>
                  )}
                </div>
              )}

              {!verifyResult.configured && verifyResult.envVars && (
                <div className="space-y-2 p-4 bg-red-50 rounded-md">
                  <h4 className="font-medium text-red-800">Environment Variable Not Set</h4>
                  <div className="text-sm text-red-700">
                    <p>The SLACK_WEBHOOK_URL environment variable is not set on the server.</p>
                    <p className="mt-2">
                      Current environment: {verifyResult.envVars.nodeEnv || "unknown"} /{" "}
                      {verifyResult.envVars.vercelEnv || "unknown"}
                    </p>
                  </div>
                </div>
              )}

              {verifyResult.error && (
                <div className="text-red-600">
                  <strong>Error:</strong> {verifyResult.error}
                </div>
              )}
            </div>
          ) : (
            <div>Verifying webhook configuration...</div>
          )}
        </CardContent>
      </Card>

      {/* Test Webhook */}
      <Card>
        <CardHeader>
          <CardTitle>Test Webhook</CardTitle>
          <CardDescription>Send a test message to verify your webhook</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Custom Webhook URL (Optional)</Label>
              <Input
                id="webhook-url"
                placeholder="https://hooks.slack.com/services/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave empty to use the server's environment variable</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-message">Test Message</Label>
              <Input
                id="test-message"
                placeholder="Enter a test message"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
              />
            </div>

            <Button onClick={testWebhook} disabled={testLoading} className="w-full">
              {testLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {testLoading ? "Sending..." : "Send Test Message"}
            </Button>

            {testResult && (
              <div className="mt-4 p-4 rounded-md bg-gray-50">
                <h4 className="font-medium mb-2">Test Results:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(testResult.success, testResult.success ? "Success" : "Failed")}
                  </div>
                  {testResult.message && (
                    <div>
                      <strong>Message:</strong> {testResult.message}
                    </div>
                  )}
                  {testResult.error && (
                    <div className="text-red-600">
                      <strong>Error:</strong> {testResult.error}
                    </div>
                  )}
                  {testResult.webhookTest && (
                    <div>
                      <strong>Webhook Test:</strong> {testResult.webhookTest.success ? "Passed" : "Failed"}
                      {testResult.webhookTest.error && (
                        <div className="text-red-600 mt-1">
                          <strong>Webhook Error:</strong> {testResult.webhookTest.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Guide</CardTitle>
          <CardDescription>Common issues and solutions</CardDescription>
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
              <h4 className="font-medium mb-2">If webhook test fails with "invalid_payload":</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Verify your Slack webhook URL is correct and hasn't expired</li>
                <li>Make sure the webhook URL belongs to the correct Slack workspace</li>
                <li>Check if the Slack app has the necessary permissions</li>
                <li>Try creating a new webhook URL in your Slack app settings</li>
              </ol>
            </div>

            <div>
              <h4 className="font-medium mb-2">If you see "channel_not_found" error:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Make sure the channel specified in your webhook still exists</li>
                <li>Check if the Slack app has been invited to the channel</li>
                <li>Verify the channel name hasn't changed</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
