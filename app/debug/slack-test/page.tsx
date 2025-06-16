"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SlackTestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testSlackConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/slack/test", { method: "POST" })
      const data = await response.json()
      setResult({ type: "connection", data })
    } catch (error) {
      setResult({ type: "connection", error: error instanceof Error ? error.message : "Unknown error" })
    }
    setLoading(false)
  }

  const testFullAlert = async () => {
    setLoading(true)
    try {
      const testItems = [
        {
          partNumber: "TEST-001",
          description: "Test Resistor 1K OHM",
          currentStock: 2,
          reorderPoint: 10,
          supplier: "TEST SUPPLIER",
          location: "A1-001",
        },
      ]

      const response = await fetch("/api/slack/send-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: testItems }),
      })

      const data = await response.json()
      setResult({ type: "full", data, status: response.status })
    } catch (error) {
      setResult({ type: "full", error: error instanceof Error ? error.message : "Unknown error" })
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>🔒 Secure Slack Integration Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription>
              <strong>Security Note:</strong> This page does not expose any webhook URLs or sensitive information.
            </AlertDescription>
          </Alert>

          <div className="flex flex-wrap gap-4">
            <Button onClick={testSlackConnection} disabled={loading} variant="default">
              🧪 Test Connection
            </Button>
            <Button onClick={testFullAlert} disabled={loading} variant="default">
              📋 Test Alert
            </Button>
          </div>

          {loading && (
            <Alert>
              <AlertDescription>🔄 Testing Slack integration...</AlertDescription>
            </Alert>
          )}

          <Card className="bg-green-50">
            <CardHeader>
              <CardTitle className="text-sm">🔒 Security Features</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>✅ No webhook URLs exposed to client</p>
              <p>✅ No sensitive data in API responses</p>
              <p>✅ No detailed error messages</p>
              <p>✅ Server-side only webhook handling</p>
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
