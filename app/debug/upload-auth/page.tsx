"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function UploadAuthDebugPage() {
  const [envData, setEnvData] = useState<any>(null)
  const [testPassword, setTestPassword] = useState("")
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/debug/upload-auth")
      .then((res) => res.json())
      .then(setEnvData)
      .catch(console.error)
  }, [])

  const testAuth = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/auth/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: testPassword }),
      })

      const result = await response.json()
      setTestResult({
        status: response.status,
        success: result.success,
        error: result.error,
        response: result,
      })
    } catch (error) {
      setTestResult({
        error: "Request failed",
        details: error,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Upload Authentication Debug</h1>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>Current upload password configuration</CardDescription>
        </CardHeader>
        <CardContent>
          {envData ? (
            <div className="space-y-2">
              <div>
                <strong>Environment:</strong> {envData.environment?.NODE_ENV} / {envData.environment?.VERCEL_ENV}
              </div>
              <div>
                <strong>Password Exists:</strong> {envData.uploadPassword?.exists ? "✅ Yes" : "❌ No"}
              </div>
              <div>
                <strong>Password Length:</strong> {envData.uploadPassword?.length}
              </div>
              <div>
                <strong>Password Type:</strong> {envData.uploadPassword?.type}
              </div>
              {envData.uploadPassword?.value && (
                <div>
                  <strong>Password Value:</strong> "{envData.uploadPassword.value}"
                </div>
              )}
            </div>
          ) : (
            <div>Loading environment data...</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Authentication</CardTitle>
          <CardDescription>Test the upload password authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              type="password"
              placeholder="Enter password to test"
              value={testPassword}
              onChange={(e) => setTestPassword(e.target.value)}
            />
          </div>
          <Button onClick={testAuth} disabled={loading || !testPassword}>
            {loading ? "Testing..." : "Test Password"}
          </Button>

          {testResult && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <strong>Test Result:</strong>
              <pre className="mt-2 text-sm">{JSON.stringify(testResult, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
