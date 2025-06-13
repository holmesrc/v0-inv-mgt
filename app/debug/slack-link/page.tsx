"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Check, Send } from "lucide-react"
import { createApprovalBlocks, sendSlackMessage } from "@/lib/slack"

export default function SlackLinkDebugPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [testChange, setTestChange] = useState<any>(null)

  // Create a test change and send a notification
  const createTestChange = async () => {
    try {
      setLoading(true)
      setResult(null)

      // Create a test change
      const response = await fetch("/api/debug/test-slack-interaction")

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error creating test change: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      setTestChange(data.change)

      // Send a notification for the test change
      const message = createApprovalBlocks(data.change)
      const slackResponse = await sendSlackMessage(message)

      setResult({
        success: true,
        message: "Test change created and notification sent",
        changeId: data.changeId,
        slackResponse,
      })
    } catch (error) {
      console.error("Error creating test change:", error)
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
          <CardTitle className="text-2xl">Slack Link Debug</CardTitle>
          <CardDescription>Test Slack messages with direct links to approval page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Result Alert */}
          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertDescription>
                {result.success ? result.message : result.error || "Failed to create test change"}
                {result.changeId && (
                  <div className="mt-2 text-sm">
                    Test Change ID: <code className="bg-gray-100 p-1 rounded">{result.changeId}</code>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Test Change Info */}
          {testChange && (
            <div className="p-4 border rounded-md bg-gray-50">
              <h3 className="font-medium mb-2">Test Change Details</h3>
              <pre className="text-xs overflow-auto p-2 bg-gray-100 rounded">{JSON.stringify(testChange, null, 2)}</pre>
            </div>
          )}

          {/* Create Test Change Button */}
          <Button onClick={createTestChange} disabled={loading} className="flex items-center gap-1">
            <Send className="h-4 w-4" />
            Create Test Change & Send Notification
          </Button>

          {/* Instructions */}
          <div className="mt-4 p-4 border rounded-md bg-blue-50">
            <h3 className="font-medium mb-2">How to Test</h3>
            <ol className="list-decimal list-inside space-y-2">
              <li>Click the button above to create a test change and send a notification to Slack</li>
              <li>Check your Slack channel for the notification</li>
              <li>Click the "Review Change" link in the Slack message</li>
              <li>You'll be taken to the approval page where you can approve or reject the change</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
