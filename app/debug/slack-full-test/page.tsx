"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, XCircle, AlertTriangle, Send, Settings } from "lucide-react"

export default function SlackFullTestPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [customMessage, setCustomMessage] = useState("🧪 Test message from Inventory Management System")
  const [customWebhook, setCustomWebhook] = useState("")

  const runFullTest = async () => {
    setLoading(true)
    setResults(null)

    try {
      // Step 1: Check environment variables
      console.log("🔍 Step 1: Checking environment variables...")
      const envResponse = await fetch("/api/debug/env")
      const envResult = await envResponse.json()

      // Step 2: Check Slack configuration
      console.log("🔍 Step 2: Checking Slack configuration...")
      const configResponse = await fetch("/api/debug/slack-config")
      const configResult = await configResponse.json()

      // Step 3: Test Slack webhook
      console.log("🔍 Step 3: Testing Slack webhook...")
      const testResponse = await fetch("/api/debug/test-slack-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: customMessage,
          webhookUrl: customWebhook || undefined,
        }),
      })
      const testResult = await testResponse.json()

      // Step 4: Test approval notification
      console.log("🔍 Step 4: Testing approval notification...")
      const approvalResponse = await fetch("/api/debug/test-approval-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testMode: true,
        }),
      })
      const approvalResult = await approvalResponse.json()

      setResults({
        env: envResult,
        config: configResult,
        webhook: testResult,
        approval: approvalResult,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Test failed:", error)
      setResults({
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  const sendCustomMessage = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/debug/test-slack-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: customMessage,
          webhookUrl: customWebhook || undefined,
        }),
      })
      const result = await response.json()

      alert(result.success ? "✅ Message sent successfully!" : `❌ Failed: ${result.error}`)
    } catch (error) {
      alert(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (success: boolean, configured?: boolean) => {
    if (configured === false) {
      return <Badge variant="secondary">Not Configured</Badge>
    }
    return success ? (
      <Badge variant="default" className="bg-green-500">
        <CheckCircle className="w-3 h-3 mr-1" />
        Success
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Failed
      </Badge>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Slack Integration Full Test</h1>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This page tests all aspects of the Slack integration. Run the full test to diagnose any issues.
        </AlertDescription>
      </Alert>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Test Controls</CardTitle>
          <CardDescription>Configure and run Slack integration tests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="customMessage">Custom Test Message</Label>
            <Textarea
              id="customMessage"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Enter a custom message to test..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="customWebhook">Custom Webhook URL (Optional)</Label>
            <Input
              id="customWebhook"
              type="url"
              value={customWebhook}
              onChange={(e) => setCustomWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
            />
            <p className="text-xs text-muted-foreground mt-1">Leave empty to use the environment variable</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={runFullTest} disabled={loading}>
              {loading ? "Running Tests..." : "Run Full Test"}
            </Button>
            <Button onClick={sendCustomMessage} variant="outline" disabled={loading}>
              <Send className="w-4 h-4 mr-2" />
              Send Test Message
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>Test completed at {new Date(results.timestamp).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.error ? (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Test Failed:</strong> {results.error}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {/* Environment Variables */}
                <div className="border rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">1. Environment Variables</h3>
                    {getStatusBadge(results.env?.success)}
                  </div>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>SLACK_WEBHOOK_URL:</strong>{" "}
                      {results.env?.variables?.SLACK_WEBHOOK_URL ? "✅ Set" : "❌ Not Set"}
                    </p>
                    <p>
                      <strong>NODE_ENV:</strong> {results.env?.variables?.NODE_ENV || "unknown"}
                    </p>
                    {results.env?.error && (
                      <p className="text-red-600">
                        <strong>Error:</strong> {results.env.error}
                      </p>
                    )}
                  </div>
                </div>

                {/* Slack Configuration */}
                <div className="border rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">2. Slack Configuration</h3>
                    {getStatusBadge(results.config?.success, !results.config?.configured)}
                  </div>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Configured:</strong> {results.config?.configured ? "✅ Yes" : "❌ No"}
                    </p>
                    <p>
                      <strong>Message:</strong> {results.config?.message}
                    </p>
                    {results.config?.error && (
                      <p className="text-red-600">
                        <strong>Error:</strong> {results.config.error}
                      </p>
                    )}
                  </div>
                </div>

                {/* Webhook Test */}
                <div className="border rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">3. Webhook Test</h3>
                    {getStatusBadge(results.webhook?.success)}
                  </div>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Status:</strong> {results.webhook?.success ? "✅ Success" : "❌ Failed"}
                    </p>
                    {results.webhook?.message && (
                      <p>
                        <strong>Message:</strong> {results.webhook.message}
                      </p>
                    )}
                    {results.webhook?.error && (
                      <p className="text-red-600">
                        <strong>Error:</strong> {results.webhook.error}
                      </p>
                    )}
                  </div>
                </div>

                {/* Approval Notification Test */}
                <div className="border rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">4. Approval Notification Test</h3>
                    {getStatusBadge(results.approval?.success)}
                  </div>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Status:</strong> {results.approval?.success ? "✅ Success" : "❌ Failed"}
                    </p>
                    {results.approval?.message && (
                      <p>
                        <strong>Message:</strong> {results.approval.message}
                      </p>
                    )}
                    {results.approval?.error && (
                      <p className="text-red-600">
                        <strong>Error:</strong> {results.approval.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <strong>If environment variables are not set:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Check that SLACK_WEBHOOK_URL is added in Vercel project settings</li>
                <li>Ensure the variable is set for all environments (Production, Preview, Development)</li>
                <li>Redeploy the application after adding the variable</li>
              </ul>
            </div>
            <div>
              <strong>If webhook test fails:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Verify the Slack webhook URL is correct</li>
                <li>Check that the Slack app has permission to post to the channel</li>
                <li>Test the webhook URL directly using curl or Postman</li>
              </ul>
            </div>
            <div>
              <strong>If approval notifications fail:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Check the browser console for detailed error messages</li>
                <li>Verify the database connection is working</li>
                <li>Ensure the pending_changes table exists</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
