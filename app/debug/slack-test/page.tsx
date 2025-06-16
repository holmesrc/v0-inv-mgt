"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SlackTestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  // ✅ UPDATED: Using your CORRECT webhook URL
  const [customWebhook, setCustomWebhook] = useState(
    "https://hooks.slack.com/services/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",
  )

  const testDirectWebhook = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/test-slack-direct")
      const data = await response.json()
      setResult({ type: "direct", data })
    } catch (error) {
      setResult({ type: "direct", error: error instanceof Error ? error.message : "Unknown error" })
    }
    setLoading(false)
  }

  const testSimpleSlack = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/simple-slack-test", { method: "POST" })
      const data = await response.json()
      setResult({ type: "simple", data })
    } catch (error) {
      setResult({ type: "simple", error: error instanceof Error ? error.message : "Unknown error" })
    }
    setLoading(false)
  }

  const testFullAlert = async () => {
    setLoading(true)
    try {
      // Create test data
      const testItems = [
        {
          partNumber: "TEST-001",
          description: "Test Resistor 1K OHM",
          currentStock: 2,
          reorderPoint: 10,
          supplier: "TEST SUPPLIER",
          location: "A1-001",
        },
        {
          partNumber: "TEST-002",
          description: "Test Capacitor 100uF",
          currentStock: 1,
          reorderPoint: 5,
          supplier: "TEST SUPPLIER",
          location: "A1-002",
        },
      ]

      console.log("🧪 Testing full alert with CORRECT webhook:", customWebhook)

      const response = await fetch("/api/slack/send-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: testItems,
          webhookUrl: customWebhook, // ✅ This will use the correct URL
        }),
      })

      const data = await response.json()
      console.log("🧪 Full alert response:", data)
      setResult({ type: "full", data, status: response.status })
    } catch (error) {
      console.error("🧪 Full alert error:", error)
      setResult({ type: "full", error: error instanceof Error ? error.message : "Unknown error" })
    }
    setLoading(false)
  }

  const testCustomWebhook = async () => {
    setLoading(true)
    try {
      const testPayload = {
        text: "🧪 Direct webhook test - Using your CORRECT webhook URL!",
      }

      console.log("🧪 Testing CORRECT webhook:", customWebhook)

      const response = await fetch(customWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
      })

      const responseText = await response.text()
      console.log("🧪 Custom webhook response:", { status: response.status, text: responseText })

      setResult({
        type: "custom",
        data: {
          success: response.ok,
          status: response.status,
          response: responseText,
          webhookUrl: customWebhook,
        },
      })
    } catch (error) {
      console.error("🧪 Custom webhook error:", error)
      setResult({ type: "custom", error: error instanceof Error ? error.message : "Unknown error" })
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Enhanced Slack Integration Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Webhook URL Display */}
          <Alert>
            <AlertDescription>
              <strong>Current Webhook:</strong> {customWebhook.substring(0, 60)}...
              <br />
              <strong>Webhook ID:</strong> B0921PKHJ2V ✅ (This should be your correct one!)
            </AlertDescription>
          </Alert>

          {/* Custom Webhook Input */}
          <div className="space-y-2">
            <Label htmlFor="webhook">Webhook URL:</Label>
            <Input
              id="webhook"
              value={customWebhook}
              onChange={(e) => setCustomWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
            />
          </div>

          {/* Test Buttons */}
          <div className="flex flex-wrap gap-4">
            <Button onClick={testCustomWebhook} disabled={loading} variant="default">
              🧪 Test Direct Webhook
            </Button>
            <Button onClick={testFullAlert} disabled={loading} variant="default">
              📋 Test Full Alert
            </Button>
            <Button onClick={testDirectWebhook} disabled={loading} variant="outline">
              🔧 Test API Route
            </Button>
            <Button onClick={testSimpleSlack} disabled={loading} variant="outline">
              📝 Test Simple Message
            </Button>
          </div>

          {loading && (
            <Alert>
              <AlertDescription>🔄 Testing webhook... Check browser console for detailed logs.</AlertDescription>
            </Alert>
          )}

          {/* Enhanced Troubleshooting Guide */}
          <Card className="bg-blue-50">
            <CardHeader>
              <CardTitle className="text-sm">🔧 Troubleshooting Guide</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>
                <strong>✅ Test Order:</strong> Try "Test Direct Webhook" first, then "Test Full Alert"
              </p>
              <p>
                <strong>Your Webhook ID:</strong> B0921PKHJ2V (should see this in results)
              </p>
              <p>
                <strong>404 "no_service":</strong> Webhook expired - create new one at api.slack.com/apps
              </p>
              <p>
                <strong>400 "invalid_payload":</strong> Message format issue - check payload structure
              </p>
              <p>
                <strong>403 Forbidden:</strong> Permission denied - check app permissions in Slack
              </p>
            </CardContent>
          </Card>

          {result && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">
                Test Result ({result.type}) - {result.data?.success ? "✅ SUCCESS" : "❌ FAILED"}:
              </h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
