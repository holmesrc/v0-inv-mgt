"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function WebhookVerifyPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testWebhook = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/test-webhook-simple", {
        method: "POST",
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Unknown error" })
    }
    setLoading(false)
  }

  const testDirectFetch = async () => {
    setLoading(true)
    try {
      // Test the webhook directly from the browser
      const webhookUrl = "https://hooks.slack.com/services/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"

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: "🧪 Direct browser test - if you see this, webhook works!",
        }),
      })

      const responseText = await response.text()

      setResult({
        type: "direct",
        success: response.ok,
        status: response.status,
        response: responseText,
      })
    } catch (error) {
      setResult({
        type: "direct",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Webhook Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p>
              <strong>Testing webhook:</strong>
            </p>
            <code className="bg-gray-100 p-2 rounded text-sm block">
              https://hooks.slack.com/services/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
            </code>
          </div>

          <div className="flex gap-4">
            <Button onClick={testWebhook} disabled={loading}>
              Test via API Route
            </Button>
            <Button onClick={testDirectFetch} disabled={loading} variant="outline">
              Test Direct from Browser
            </Button>
          </div>

          {loading && <div className="text-blue-600">Testing webhook...</div>}

          {result && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Test Result:</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>

              {result.success && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                  <p className="text-green-800">
                    ✅ <strong>Webhook is working!</strong> Check your #inventory-alerts channel for the test message.
                  </p>
                </div>
              )}

              {!result.success && result.status === 400 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-yellow-800">
                    ⚠️ <strong>Invalid payload format.</strong> The webhook URL is valid but the message format needs
                    adjustment.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
