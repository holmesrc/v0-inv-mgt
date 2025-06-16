"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SlackDetailedTestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runDetailedTest = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/slack-detailed-test", {
        method: "POST",
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

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Detailed Slack Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription>
              This will show detailed server-side logs of exactly what happens when we try to send a Slack message.
            </AlertDescription>
          </Alert>

          <Button onClick={runDetailedTest} disabled={loading} variant="default">
            {loading ? "🔄 Testing..." : "🧪 Run Detailed Test"}
          </Button>

          {result && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Test Result - {result.success ? "✅ SUCCESS" : "❌ FAILED"}:</h3>

              {result.logs && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Server Logs:</h4>
                  <div className="bg-gray-100 p-4 rounded text-sm">
                    {result.logs.map((log: string, index: number) => (
                      <div key={index} className="mb-1">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
