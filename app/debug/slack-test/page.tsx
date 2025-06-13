"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Check, Send } from "lucide-react"

export default function SlackDebugPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [webhookUrl, setWebhookUrl] = useState("")
  const [message, setMessage] = useState("Test message from Inventory Management System")
  const [envWebhook, setEnvWebhook] = useState<string | null>(null)

  // Check if webhook is configured in environment
  const checkWebhookConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/debug/slack-config")

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()

      if (data.configured) {
        setEnvWebhook(data.webhookUrl ? `${data.webhookUrl.substring(0, 20)}...` : "Configured but masked")
      } else {
        setEnvWebhook(null)
      }
    } catch (error) {
      console.error("Error checking webhook config:", error)
    } finally {
      setLoading(false)
    }
  }

  // Load webhook config on mount
  useEffect(() => {
    checkWebhookConfig()
  }, [])

  // Safe JSON parsing with error handling
  const safeParseJson = async (response: Response) => {
    try {
      // First check if the response is ok
      if (!response.ok) {
        // Try to get text content for better error messages
        const errorText = await response.text()
        throw new Error(`HTTP error ${response.status}: ${errorText.substring(0, 100)}`)
      }

      // If response is ok, try to parse as JSON
      return await response.json()
    } catch (error) {
      if (error instanceof SyntaxError) {
        // JSON parse error
        const text = await response.text()
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`)
      }
      throw error
    }
  }

  // Send test message using environment webhook
  const sendTestMessage = async () => {
    try {
      setLoading(true)
      setResult(null)

      const response = await fetch("/api/debug/test-slack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
        }),
      })

      const data = await safeParseJson(response)
      setResult(data)
    } catch (error) {
      console.error("Error sending test message:", error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  // Send test message using custom webhook
  const sendCustomWebhookMessage = async () => {
    if (!webhookUrl) {
      setResult({
        success: false,
        error: "Please enter a webhook URL",
      })
      return
    }

    try {
      setLoading(true)
      setResult(null)

      const response = await fetch("/api/debug/test-slack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          webhookUrl,
        }),
      })

      const data = await safeParseJson(response)
      setResult(data)
    } catch (error) {
      console.error("Error sending test message:", error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  // Send approval notification for a specific change
  const sendApprovalNotification = async () => {
    try {
      setLoading(true)
      setResult(null)

      const response = await fetch("/api/debug/send-approval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      // Use the safe JSON parser
      const data = await safeParseJson(response)
      setResult(data)
    } catch (error) {
      console.error("Error sending approval notification:", error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Slack Integration Debug</CardTitle>
          <CardDescription>
            Test and troubleshoot your Slack webhook integration for inventory notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Environment Webhook Status */}
          <div className="p-4 border rounded-md bg-gray-50">
            <h3 className="font-medium mb-2">Environment Webhook Status</h3>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${envWebhook ? "bg-green-500" : "bg-red-500"}`}></div>
              <span>{envWebhook ? "Configured" : "Not Configured"}</span>
              {envWebhook && <span className="text-sm text-gray-500">{envWebhook}</span>}
            </div>
            <p className="text-sm mt-2">
              {envWebhook
                ? "A Slack webhook URL is configured in your environment variables."
                : "No Slack webhook URL found in environment variables. Set SLACK_WEBHOOK_URL to enable Slack notifications."}
            </p>
          </div>

          {/* Result Alert */}
          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertDescription>
                {result.success ? "Message sent successfully!" : result.error || "Failed to send message"}
                {result.details && <div className="mt-2 text-sm">{result.details}</div>}
              </AlertDescription>
            </Alert>
          )}

          {/* Test Message Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="message">Test Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter a test message to send to Slack"
                rows={3}
              />
            </div>

            <Button onClick={sendTestMessage} disabled={loading} className="flex items-center gap-1">
              <Send className="h-4 w-4" />
              Send Test Message (Using Environment Webhook)
            </Button>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Custom Webhook Test</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="webhookUrl">Custom Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is for testing only and won't be saved. Use environment variables for production.
                </p>
              </div>

              <Button onClick={sendCustomWebhookMessage} disabled={loading} className="flex items-center gap-1">
                <Send className="h-4 w-4" />
                Send Test Message (Using Custom Webhook)
              </Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Approval Notification Test</h3>
            <p className="text-sm mb-4">
              This will create a sample pending change and send an approval notification to Slack.
            </p>
            <Button onClick={sendApprovalNotification} disabled={loading} className="flex items-center gap-1">
              <Send className="h-4 w-4" />
              Send Sample Approval Notification
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
