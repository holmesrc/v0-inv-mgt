"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertCircle, ExternalLink } from "lucide-react"

export default function VerifySlackPage() {
  const [testResults, setTestResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testEndpoint = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/slack/test")
      const data = await response.json()
      setTestResults({
        success: response.ok,
        status: response.status,
        data: data,
      })
    } catch (error) {
      setTestResults({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const testInteractionEndpoint = async () => {
    setLoading(true)
    try {
      // Test with a mock Slack payload
      const mockPayload = {
        type: "block_actions",
        user: { id: "U123456", name: "test-user" },
        channel: { id: "C123456", name: "test-channel" },
        actions: [
          {
            action_id: "show_all_low_stock",
            value: "test",
          },
        ],
      }

      const response = await fetch("/api/slack/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mockPayload),
      })

      setTestResults({
        success: response.ok,
        status: response.status,
        message: "Interaction endpoint test completed",
        note: "Check your Vercel logs to see if the interaction was processed",
      })
    } catch (error) {
      setTestResults({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Slack Integration Verification</h1>
          <p className="text-muted-foreground">Test your Slack endpoints and configuration</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Configuration</CardTitle>
          <CardDescription>Your Slack app settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Request URL</h4>
              <code className="text-sm bg-gray-100 p-2 rounded block">
                https://v0-inv-mgt.vercel.app/api/slack/interactions
              </code>
            </div>
            <div>
              <h4 className="font-medium mb-2">Test Endpoint</h4>
              <code className="text-sm bg-gray-100 p-2 rounded block">
                https://v0-inv-mgt.vercel.app/api/slack/test
              </code>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Slack doesn't always show validation indicators. The best way to verify is through testing and checking
              logs.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Basic Endpoint</CardTitle>
            <CardDescription>Verify your API is reachable</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testEndpoint} disabled={loading} className="w-full">
              {loading ? "Testing..." : "Test /api/slack/test"}
            </Button>

            <div className="space-y-2">
              <h4 className="font-medium">Manual Test:</h4>
              <a
                href="https://v0-inv-mgt.vercel.app/api/slack/test"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:underline"
              >
                Open in new tab <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Interaction Endpoint</CardTitle>
            <CardDescription>Simulate a Slack interaction</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testInteractionEndpoint} disabled={loading} className="w-full">
              {loading ? "Testing..." : "Test /api/slack/interactions"}
            </Button>

            <div className="text-sm text-muted-foreground">
              This sends a mock Slack payload to test your interaction handler.
            </div>
          </CardContent>
        </Card>
      </div>

      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResults.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <Badge variant={testResults.success ? "default" : "destructive"}>{testResults.status || "Error"}</Badge>
              </div>

              {testResults.data && (
                <div>
                  <span className="font-medium">Response:</span>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-sm overflow-auto">
                    {JSON.stringify(testResults.data, null, 2)}
                  </pre>
                </div>
              )}

              {testResults.error && (
                <div>
                  <span className="font-medium text-red-600">Error:</span>
                  <p className="text-red-600">{testResults.error}</p>
                </div>
              )}

              {testResults.message && (
                <div>
                  <span className="font-medium">Message:</span>
                  <p>{testResults.message}</p>
                </div>
              )}

              {testResults.note && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{testResults.note}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Verification Checklist</CardTitle>
          <CardDescription>Steps to ensure everything is working</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="step1" />
              <label htmlFor="step1" className="text-sm">
                Test endpoint returns 200 status (use button above)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="step2" />
              <label htmlFor="step2" className="text-sm">
                Interaction endpoint accepts POST requests (use button above)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="step3" />
              <label htmlFor="step3" className="text-sm">
                Slack app has correct Request URL saved
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="step4" />
              <label htmlFor="step4" className="text-sm">
                Send a test Slack alert with interactive buttons
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="step5" />
              <label htmlFor="step5" className="text-sm">
                Click buttons in Slack and check Vercel logs for activity
              </label>
            </div>
          </div>

          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Pro Tip:</strong> Check your Vercel function logs at{" "}
              <a
                href="https://vercel.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                vercel.com/dashboard
              </a>{" "}
              to see if Slack is successfully reaching your endpoints.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800 mb-1">How Slack Validation Works</h3>
              <p className="text-sm text-blue-700">
                Slack validates your endpoint by sending a challenge request when you save the URL. If your endpoint
                responds correctly, the URL is accepted. No green checkmark doesn't necessarily mean it's broken - it
                might just mean Slack hasn't re-validated recently.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
