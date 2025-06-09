"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, RefreshCw, Shield, AlertTriangle, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function RLSTestPage() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runTest = async () => {
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch("/api/debug/rls-test", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Test failed")
        setResults(data)
      } else {
        setResults(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold mb-2">RLS Policy Test</h1>
        <p className="text-muted-foreground">Test Row Level Security policies on Supabase tables</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Row Level Security Test
          </CardTitle>
          <CardDescription>
            This test verifies that RLS policies are properly configured for inventory operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runTest} disabled={loading} className="mb-4">
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Running Test...
              </>
            ) : (
              "Run RLS Test"
            )}
          </Button>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>RLS Test Failed:</strong> {error}
                {results?.hint && (
                  <div className="mt-2">
                    <strong>Hint:</strong> {results.hint}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {results && results.success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>All RLS tests passed!</strong> Your database policies are working correctly.
              </AlertDescription>
            </Alert>
          )}

          {results && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Test Results</h3>

              {results.tests && (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(results.tests).map(([test, status]) => (
                    <div key={test} className="flex items-center justify-between p-3 border rounded">
                      <span className="font-medium">{test}</span>
                      <Badge variant={status === "✅ PASS" ? "default" : "destructive"}>{status}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {results.details && (
                <div className="mt-4 p-4 bg-gray-50 rounded">
                  <h4 className="font-medium mb-2">Error Details:</h4>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">{results.details}</pre>
                  {results.code && (
                    <div className="mt-2">
                      <strong>Error Code:</strong> {results.code}
                    </div>
                  )}
                </div>
              )}

              {results.inventoryCount !== undefined && (
                <div className="mt-4 p-4 bg-blue-50 rounded">
                  <h4 className="font-medium mb-2">Database Status:</h4>
                  <p>Inventory items: {results.inventoryCount}</p>
                  <p>Settings records: {results.settingsCount}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fix Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>If the RLS test fails, follow these steps:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to your Supabase dashboard → SQL Editor</li>
              <li>
                Run the script:{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">scripts/005-enable-rls-policies.sql</code>
              </li>
              <li>
                Then run: <code className="bg-gray-100 px-2 py-1 rounded">scripts/006-verify-rls-setup.sql</code>
              </li>
              <li>Come back to this page and click "Run RLS Test" again</li>
            </ol>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> RLS (Row Level Security) policies control who can access your database
                tables. Without proper policies, your application cannot read or write data even with valid credentials.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
