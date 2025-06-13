"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PasswordDebugInfo {
  hasEnvPassword: boolean
  envPasswordLength: number
  usingFallback: boolean
  actualPasswordLength: number
  passwordPreview: string
}

export default function UploadPasswordDebug() {
  const [debugInfo, setDebugInfo] = useState<PasswordDebugInfo | null>(null)
  const [testPassword, setTestPassword] = useState("")
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/debug/upload-password")
      .then((res) => res.json())
      .then(setDebugInfo)
      .catch(console.error)
  }, [])

  const testPasswordAuth = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/auth/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: testPassword }),
      })
      const result = await response.json()
      setTestResult({ ...result, status: response.status })
    } catch (error) {
      setTestResult({ error: "Network error", details: error })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Upload Password Debug</h1>

      <Card>
        <CardHeader>
          <CardTitle>Environment Configuration</CardTitle>
          <CardDescription>Current upload password configuration</CardDescription>
        </CardHeader>
        <CardContent>
          {debugInfo ? (
            <div className="space-y-2">
              <p>
                <strong>Has Environment Variable:</strong> {debugInfo.hasEnvPassword ? "✅ Yes" : "❌ No"}
              </p>
              <p>
                <strong>Environment Password Length:</strong> {debugInfo.envPasswordLength}
              </p>
              <p>
                <strong>Using Fallback:</strong> {debugInfo.usingFallback ? "⚠️ Yes (admin123)" : "✅ No"}
              </p>
              <p>
                <strong>Actual Password Length:</strong> {debugInfo.actualPasswordLength}
              </p>
              <p>
                <strong>Password Preview:</strong> <code>{debugInfo.passwordPreview}</code>
              </p>
            </div>
          ) : (
            <p>Loading configuration...</p>
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
            <Label htmlFor="testPassword">Enter password to test</Label>
            <Input
              id="testPassword"
              type="password"
              value={testPassword}
              onChange={(e) => setTestPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>
          <Button onClick={testPasswordAuth} disabled={loading || !testPassword}>
            {loading ? "Testing..." : "Test Password"}
          </Button>
          {testResult && (
            <div className="mt-4 p-4 border rounded">
              <h4 className="font-semibold">Test Result:</h4>
              <pre className="text-sm mt-2 overflow-auto">{JSON.stringify(testResult, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
