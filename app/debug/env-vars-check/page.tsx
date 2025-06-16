"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function EnvVarsCheckPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkEnvVars = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/env-vars-check")
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
    setLoading(false)
  }

  // Auto-load on page load
  useEffect(() => {
    checkEnvVars()
  }, [])

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Environment Variables Check</CardTitle>
          <p className="text-sm text-gray-600">
            Check which environment variables are actually available in the deployed application.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button onClick={checkEnvVars} disabled={loading}>
            {loading ? "🔄 Checking..." : "🔍 Check Environment Variables"}
          </Button>

          {result && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Environment Variables Status:</h3>
                <div className="space-y-2">
                  {Object.entries(result.environmentVariables || {}).map(([key, exists]) => (
                    <div key={key} className="flex justify-between items-center">
                      <code className="text-sm">{key}</code>
                      <span className={exists ? "text-green-600" : "text-red-600"}>
                        {exists ? "✅ Set" : "❌ Not Set"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {result.activeWebhook && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Active Webhook:</h3>
                  <p>
                    <strong>Source:</strong> {result.activeWebhook.source}
                  </p>
                  <p>
                    <strong>Ends with:</strong> ...{result.activeWebhook.lastChars}
                  </p>
                </div>
              )}

              {!result.activeWebhook && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-red-700">❌ No Active Webhook</h3>
                  <p className="text-red-600">No Slack webhook environment variables found.</p>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Deployment Info:</h3>
                <p className="text-sm">
                  <strong>Check Time:</strong> {result.deploymentTime}
                </p>
              </div>

              {result.error && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-red-700">Error:</h3>
                  <p className="text-red-600">{result.error}</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-semibold mb-2">🔧 Next Steps:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Check which environment variables are actually set</li>
              <li>If SLACK_WEBHOOK_URL_NEW is not set, add it in Vercel</li>
              <li>If it shows as set but webhook still fails, there may be a deployment issue</li>
              <li>Compare the "ends with" value to your expected webhook URL</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
