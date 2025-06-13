"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react"

export default function ApprovalTestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [changeId, setChangeId] = useState("")
  const [appUrl, setAppUrl] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Get the app URL
  useEffect(() => {
    const origin = window.location.origin
    setAppUrl(origin)

    if (origin.includes("vusercontent.net") || origin.includes("vercel.app")) {
      setError(
        "You appear to be in a preview environment. The approval links may not work correctly. Please deploy your app and update the URL below.",
      )
    }
  }, [])

  const handleApiCall = async (url: string, options: RequestInit = {}) => {
    try {
      console.log(`Making API call to: ${url}`)

      const response = await fetch(url, options)

      console.log(`Response status: ${response.status}`)
      console.log(`Response headers:`, Object.fromEntries(response.headers.entries()))

      const contentType = response.headers.get("content-type")

      if (contentType && contentType.includes("application/json")) {
        const data = await response.json()
        console.log(`Response data:`, data)
        return { response, data }
      } else {
        const text = await response.text()
        console.error(`Non-JSON response (${response.status}):`, text)
        throw new Error(
          `Server returned non-JSON response: ${response.status}\n\nResponse: ${text.substring(0, 200)}${text.length > 200 ? "..." : ""}`,
        )
      }
    } catch (fetchError) {
      console.error(`Fetch error for ${url}:`, fetchError)
      throw fetchError
    }
  }

  const runSimpleTest = async () => {
    try {
      setLoading(true)
      setResult(null)

      const { data } = await handleApiCall("/api/debug/simple-test")

      setResult({
        success: data.success,
        message: data.success ? "Simple test passed" : "Simple test failed",
        error: data.error,
        details: data,
      })
    } catch (error) {
      console.error("Error running simple test:", error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const runBasicTest = async () => {
    try {
      setLoading(true)
      setResult(null)

      const { data } = await handleApiCall("/api/debug/basic-test")

      setResult({
        success: data.success,
        message: data.success ? "Basic test passed" : "Basic test failed",
        error: data.error,
        details: data,
      })
    } catch (error) {
      console.error("Error running basic test:", error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const createTestChange = async () => {
    try {
      setLoading(true)
      setResult(null)

      const { response, data } = await handleApiCall("/api/debug/create-test-change", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`Failed to create test change: ${response.status} - ${data?.error || "Unknown error"}`)
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to create test change")
      }

      setChangeId(data.changeId)
      setResult({
        success: true,
        message: `Test change created with ID: ${data.changeId}`,
        changeId: data.changeId,
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

  const sendNotification = async () => {
    try {
      if (!changeId) {
        throw new Error("No change ID available. Create a test change first.")
      }

      setLoading(true)
      setResult(null)

      const { response, data } = await handleApiCall(
        `/api/debug/send-approval-notification?changeId=${changeId}&appUrl=${encodeURIComponent(appUrl)}`,
        {
          method: "POST",
        },
      )

      if (!response.ok) {
        throw new Error(`Failed to send notification: ${response.status} - ${data?.error || "Unknown error"}`)
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to send notification")
      }

      setResult({
        success: true,
        message: "Approval notification sent successfully",
      })
    } catch (error) {
      console.error("Error sending notification:", error)
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
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Approval Flow Test</CardTitle>
          <CardDescription>Test the approval flow step by step</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
              <AlertDescription>
                <div>{result.success ? result.message : result.error}</div>
                {result.details && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm">Show Details</summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="app-url">App URL</Label>
            <Input
              id="app-url"
              value={appUrl}
              onChange={(e) => setAppUrl(e.target.value)}
              placeholder="https://your-deployed-app.com"
            />
            <p className="text-sm text-gray-500">
              This is the URL that will be used for approval links. Make sure it's your actual deployed application URL.
            </p>
          </div>

          {changeId && (
            <div className="space-y-2">
              <Label htmlFor="change-id">Change ID</Label>
              <Input id="change-id" value={changeId} readOnly />
              <p className="text-sm text-gray-500">This is the ID of the test change that was created.</p>
            </div>
          )}

          {changeId && (
            <div className="space-y-2">
              <Label htmlFor="approval-url">Approval URL</Label>
              <Input id="approval-url" value={`${appUrl}/approval/${changeId}`} readOnly />
              <p className="text-sm text-gray-500">
                This is the URL that will be used for approval. You can test it directly.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2">
          <Button onClick={runSimpleTest} disabled={loading} variant="outline" size="sm">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            1. Simple Test
          </Button>
          <Button onClick={runBasicTest} disabled={loading} variant="outline" size="sm">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            2. Basic Test
          </Button>
          <Button onClick={createTestChange} disabled={loading} size="sm">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            3. Create Test Change
          </Button>
          <Button onClick={sendNotification} disabled={loading || !changeId} size="sm">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            4. Send Notification
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
