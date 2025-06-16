"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function WebhookVerifyPage() {
  const [webhookUrl, setWebhookUrl] = useState("")
  const [message, setMessage] = useState("🧪 Manual test from debug page")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testWebhook = async () => {
    if (!webhookUrl.trim()) {
      setResult({ success: false, error: "Please enter a webhook URL" })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/debug/test-manual-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhookUrl: webhookUrl.trim(),
          message: message.trim() || "🧪 Manual test from debug page",
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }

    setLoading(false)
  }

  const loadFromEnv = async () => {
    try {
      const response = await fetch("/api/debug/webhook-check")
      const data = await response.json()

      if (data.exists) {
        // We can't get the full URL from env for security, but we can show what we know
        setResult({
          info: true,
          message: "Environment variable exists but cannot display full URL for security",
          envInfo: data,
        })
      } else {
        setResult({
          success: false,
          error: "No webhook URL found in environment variables",
        })
      }
    } catch (error) {
      setResult({
        success: false,
        error: "Failed to check environment variables",
      })
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🔧 Manual Webhook Tester</CardTitle>
          <p className="text-sm text-gray-600">
            Test any Slack webhook URL directly. This bypasses environment variables and tests the webhook immediately.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Slack Webhook URL</Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://hooks.slack.com/services/T.../B.../..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">Paste your complete Slack webhook URL here</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Test Message</Label>
            <Textarea
              id="message"
              placeholder="Enter your test message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <Button onClick={testWebhook} disabled={loading} className="flex-1">
              {loading ? "🔄 Testing..." : "🧪 Test Webhook"}
            </Button>
            <Button onClick={loadFromEnv} variant="outline">
              📋 Check Env Var
            </Button>
          </div>

          {result && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Test Result:</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                {result.success && (
                  <div className="text-green-700">
                    <p className="font-semibold">✅ SUCCESS!</p>
                    <p>Status: {result.status}</p>
                    <p>Response: {result.response}</p>
                    <p className="mt-2 text-sm">🎉 Check your Slack channel - the message should have appeared!</p>
                  </div>
                )}

                {result.success === false && (
                  <div className="text-red-700">
                    <p className="font-semibold">❌ FAILED</p>
                    <p>Error: {result.error}</p>
                    {result.status && <p>Status: {result.status}</p>}
                    {result.response && <p>Response: {result.response}</p>}
                  </div>
                )}

                {result.info && (
                  <div className="text-blue-700">
                    <p className="font-semibold">ℹ️ Environment Info</p>
                    <pre className="text-xs mt-2 bg-white p-2 rounded">{JSON.stringify(result.envInfo, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-2">🔍 How to Use:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Copy your webhook URL from Vercel environment variables</li>
              <li>Paste it in the "Slack Webhook URL" field above</li>
              <li>Optionally customize the test message</li>
              <li>Click "Test Webhook" to send directly to Slack</li>
              <li>Check your Slack channel for the message</li>
            </ol>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-semibold mb-2">🔒 Security Note:</h4>
            <p className="text-sm">
              This page allows direct webhook testing but doesn't store or log your webhook URL. The URL is only used
              for the immediate test request.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
