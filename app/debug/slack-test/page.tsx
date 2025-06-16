"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SlackTestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

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
          <CardTitle>🧪 Slack Integration Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={testDirectWebhook} disabled={loading}>
              Test Direct Webhook
            </Button>
            <Button onClick={testSimpleSlack} disabled={loading}>
              Test Simple Message
            </Button>
            <Button onClick={testFullAlert} disabled={loading}>
              Test Full Alert
            </Button>
          </div>

          {loading && <div className="text-blue-600">Testing...</div>}

          {result && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Test Result ({result.type}):</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
