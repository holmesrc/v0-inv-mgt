"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function SlackUrlTestPage() {
  const [debugData, setDebugData] = useState<any>(null)
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runDebugTest = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/slack-url-test")
      const data = await response.json()
      setDebugData(data)
    } catch (error) {
      console.error("Debug test failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const runUrlConstructionTest = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/slack-url-test", {
        method: "POST",
      })
      const data = await response.json()
      setTestResult(data)
    } catch (error) {
      console.error("URL construction test failed:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Slack URL Debug Test</h1>
          <p className="text-muted-foreground">Debug why Slack is getting the wrong approval URL</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables Check</CardTitle>
            <CardDescription>Check what URLs are available in environment variables</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={runDebugTest} disabled={loading}>
              {loading ? "Running..." : "Check Environment Variables"}
            </Button>

            {debugData && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Environment Variables:</h3>
                  <div className="grid gap-2">
                    {Object.entries(debugData.environmentVariables).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Badge variant="outline">{key}</Badge>
                        <span className="font-mono text-sm">
                          {value ? String(value) : <span className="text-red-500">Not set</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">URL Construction Test:</h3>
                  <div className="grid gap-2">
                    {Object.entries(debugData.simulatedLogic).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Badge variant="outline">{key}</Badge>
                        <span className="font-mono text-sm">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-red-50 border border-red-200 rounded">
                  <h3 className="font-semibold text-red-800 mb-2">Issue Analysis:</h3>
                  <p className="text-sm text-red-700 mb-2">Expected: {debugData.issue.expectedUrl}</p>
                  <p className="text-sm text-red-700 mb-2">Actual in Slack: {debugData.issue.actualUrlInSlack}</p>
                  <p className="text-sm text-red-700">Possible Cause: {debugData.issue.possibleCause}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>URL Construction Test</CardTitle>
            <CardDescription>Test the exact logic used in Slack notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={runUrlConstructionTest} disabled={loading}>
              {loading ? "Testing..." : "Test URL Construction"}
            </Button>

            {testResult && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">URL Construction Results:</h3>
                  <div className="grid gap-2">
                    {Object.entries(testResult.debugInfo).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-2">
                        <Badge variant="outline">{key}</Badge>
                        <span className="font-mono text-sm break-all">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {testResult.debugInfo.finalMessage && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                    <h3 className="font-semibold text-blue-800 mb-2">Generated Message:</h3>
                    <pre className="text-sm text-blue-700 whitespace-pre-wrap">{testResult.debugInfo.finalMessage}</pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
