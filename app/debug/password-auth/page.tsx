"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function PasswordAuthDebugPage() {
  const [envData, setEnvData] = useState<any>(null)
  const [testPassword, setTestPassword] = useState("PHL10HWLab")
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/debug/password-auth")
      .then((res) => res.json())
      .then(setEnvData)
      .catch(console.error)
  }, [])

  const testPassword2 = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/password-auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ testPassword }),
      })

      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({
        error: "Request failed",
        details: error,
      })
    } finally {
      setLoading(false)
    }
  }

  const testActualAuth = async () => {
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
        ...testResult,
        actualAuth: {
          status: response.status,
          success: result.success,
          error: result.error,
          response: result,
        },
      })
    } catch (error) {
      setTestResult({
        ...testResult,
        actualAuth: {
          error: "Request failed",
          details: error,
        },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Password Authentication Debug</h1>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>Current upload password configuration</CardDescription>
        </CardHeader>
        <CardContent>
          {envData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Environment:</strong> {envData.environment?.NODE_ENV} / {envData.environment?.VERCEL_ENV}
                </div>
                <div>
                  <strong>Password Exists:</strong>{" "}
                  {envData.uploadPassword?.exists ? (
                    <Badge variant="default">✅ Yes</Badge>
                  ) : (
                    <Badge variant="destructive">❌ No</Badge>
                  )}
                </div>
                <div>
                  <strong>Password Length:</strong> {envData.uploadPassword?.length}
                </div>
                <div>
                  <strong>Password Type:</strong> {envData.uploadPassword?.type}
                </div>
                <div>
                  <strong>Has Whitespace:</strong>{" "}
                  {envData.uploadPassword?.hasWhitespace ? (
                    <Badge variant="destructive">⚠️ Yes</Badge>
                  ) : (
                    <Badge variant="default">✅ No</Badge>
                  )}
                </div>
                <div>
                  <strong>Direct Comparison:</strong>{" "}
                  {envData.testValues?.comparison ? (
                    <Badge variant="default">✅ Match</Badge>
                  ) : (
                    <Badge variant="destructive">❌ No Match</Badge>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <strong>Password Value:</strong>
                <div className="font-mono bg-gray-100 p-2 rounded mt-1">"{envData.uploadPassword?.value}"</div>
              </div>

              {envData.uploadPassword?.charCodes && (
                <div className="mt-4">
                  <strong>Character Analysis:</strong>
                  <div className="grid grid-cols-8 gap-1 mt-2 text-xs">
                    {envData.uploadPassword.charCodes.map((item: any, index: number) => (
                      <div key={index} className="bg-gray-100 p-1 rounded text-center">
                        <div className="font-mono">{item.char}</div>
                        <div className="text-gray-500">{item.code}</div>
                      </div>
                    ))}
                  </div>
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
          <CardTitle>Test Password</CardTitle>
          <CardDescription>Test your password against the environment variable</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="Enter password to test"
              value={testPassword}
              onChange={(e) => setTestPassword(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={testPassword2} disabled={loading || !testPassword}>
              {loading ? "Testing..." : "Analyze Password"}
            </Button>
            <Button variant="outline" onClick={testActualAuth} disabled={loading || !testPassword}>
              Test Real Auth
            </Button>
            <Button variant="outline" onClick={() => setTestPassword("PHL10HWLab")}>
              Use Expected Value
            </Button>
          </div>

          {testResult && (
            <div className="space-y-4">
              {testResult.analysis && (
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-semibold mb-2">Detailed Analysis</h3>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <strong>Your Input:</strong>
                      <div className="font-mono bg-white p-2 rounded mt-1">
                        "{testResult.analysis.received.value}" (length: {testResult.analysis.received.length})
                      </div>
                    </div>
                    <div>
                      <strong>Expected:</strong>
                      <div className="font-mono bg-white p-2 rounded mt-1">
                        "{testResult.analysis.expected.value}" (length: {testResult.analysis.expected.length})
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <strong>Comparison Results:</strong>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {Object.entries(testResult.analysis.comparisons).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="capitalize">{key}:</span>
                          {value ? (
                            <Badge variant="default">✅ Match</Badge>
                          ) : (
                            <Badge variant="destructive">❌ No Match</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {testResult.analysis.differences.length > 0 && (
                    <div>
                      <strong>Character Differences:</strong>
                      <div className="mt-2 space-y-1">
                        {testResult.analysis.differences.map((diff: any, index: number) => (
                          <div key={index} className="text-sm bg-red-50 p-2 rounded">
                            Position {diff.position}: Got "{diff.received.char}" (code: {diff.received.code}) but
                            expected "{diff.expected.char}" (code: {diff.expected.code})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {testResult.actualAuth && (
                <div className="bg-blue-50 p-4 rounded">
                  <h3 className="font-semibold mb-2">Real Authentication Test</h3>
                  <pre className="text-sm overflow-auto">{JSON.stringify(testResult.actualAuth, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
