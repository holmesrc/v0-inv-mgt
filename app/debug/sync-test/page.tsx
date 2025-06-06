"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function SyncTestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const runTest = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/debug/sync-test", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      })

      const data = await response.json()
      setResult(data)

      if (!response.ok) {
        setError(`Test failed with status ${response.status}: ${data.error || "Unknown error"}`)
      }
    } catch (err) {
      setError(`Failed to run test: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runTest()
  }, [])

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/" className="flex items-center text-sm text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Database Sync Diagnostic Tool</CardTitle>
          <CardDescription>This tool tests your Supabase database connection and sync functionality</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-4" />
              <p>Running diagnostic tests...</p>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Test Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : result ? (
            <div className="space-y-6">
              <Alert variant={result.success ? "default" : "destructive"}>
                {result.success ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4" />}
                <AlertTitle>{result.success ? "All Tests Passed" : "Test Failed"}</AlertTitle>
                <AlertDescription>{result.message || result.error}</AlertDescription>
              </Alert>

              {result.details && (
                <div className="p-4 bg-gray-50 rounded-md">
                  <h3 className="font-medium mb-2">Error Details:</h3>
                  <pre className="text-sm overflow-auto p-2 bg-gray-100 rounded">{result.details}</pre>
                </div>
              )}

              {result.environment && (
                <div>
                  <h3 className="font-medium mb-2">Environment Variables:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(result.environment).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="font-mono text-sm">{key}</span>
                        <span className={`text-sm ${String(value).includes("❌") ? "text-red-500" : ""}`}>
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-blue-50 rounded-md">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-blue-500 mt-0.5 mr-2" />
                  <div>
                    <h3 className="font-medium text-blue-800 mb-1">Troubleshooting Tips</h3>
                    <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                      <li>Make sure your Supabase environment variables are correctly set in Vercel</li>
                      <li>Check that your database tables are properly created</li>
                      <li>Verify that your Supabase project is active and not paused</li>
                      <li>Ensure your IP is not blocked by Supabase security settings</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button onClick={runTest} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Running Test...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" /> Run Test Again
              </>
            )}
          </Button>
          <Link href="/">
            <Button variant="outline">Return to Dashboard</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
