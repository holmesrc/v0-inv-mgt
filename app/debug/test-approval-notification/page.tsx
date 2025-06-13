"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react"

export default function TestApprovalNotificationPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const sendTestNotification = async () => {
    try {
      setLoading(true)
      setResult(null)

      // Create a test change first
      const createResponse = await fetch("/api/debug/create-test-change", {
        method: "POST",
      })

      if (!createResponse.ok) {
        throw new Error("Failed to create test change")
      }

      const createData = await createResponse.json()

      if (!createData.success) {
        throw new Error(createData.error || "Failed to create test change")
      }

      // Send notification
      const notifyResponse = await fetch("/api/debug/send-simple-approval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changeId: createData.changeId,
        }),
      })

      if (!notifyResponse.ok) {
        throw new Error("Failed to send notification")
      }

      const notifyData = await notifyResponse.json()

      if (!notifyData.success) {
        throw new Error(notifyData.error || "Failed to send notification")
      }

      setResult({
        success: true,
        message: "Test approval notification sent successfully! Check your Slack channel.",
        changeId: createData.changeId,
      })
    } catch (error) {
      console.error("Error sending test notification:", error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Test Approval Notification</CardTitle>
          <CardDescription>Send a test approval notification to Slack</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
              <AlertDescription>
                <div>{result.success ? result.message : result.error}</div>
                {result.changeId && (
                  <div className="mt-2">
                    <a
                      href="/requests-approval"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View in Requests Approval Page →
                    </a>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="text-center">
            <Button onClick={sendTestNotification} disabled={loading} size="lg">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Send Test Notification
            </Button>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p>This will:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Create a test inventory change request</li>
              <li>Send a notification to your Slack channel</li>
              <li>Include a link to the requests-approval page</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
