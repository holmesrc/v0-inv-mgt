"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface TestResult {
  name: string
  status: "PASS" | "FAIL" | "ERROR"
  details: string
  error?: any
}

interface DiagnosticResults {
  timestamp: string
  tests: TestResult[]
  environment: {
    NODE_ENV: string
    VERCEL_ENV: string
    VERCEL_URL: string
  }
  supabaseConfig: {
    url: string
    anonKey: string
    serviceKey: string
  }
}

export default function ComprehensiveTestPage() {
  const [results, setResults] = useState<DiagnosticResults | null>(null)
  const [loading, setLoading] = useState(false)

  const runTests = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/comprehensive-test")
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Failed to run tests:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runTests()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PASS":
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case "FAIL":
        return <XCircle className="w-5 h-5 text-red-600" />
      case "ERROR":
        return <AlertTriangle className="w-5 h-5 text-orange-600" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PASS":
        return <Badge className="bg-green-100 text-green-800">PASS</Badge>
      case "FAIL":
        return <Badge className="bg-red-100 text-red-800">FAIL</Badge>
      case "ERROR":
        return <Badge className="bg-orange-100 text-orange-800">ERROR</Badge>
      default:
        return null
    }
  }

  const allTestsPassed = results?.tests.every((test) => test.status === "PASS")
  const hasFailures = results?.tests.some((test) => test.status === "FAIL" || test.status === "ERROR")

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">Comprehensive Database Diagnostic</h1>
        <p className="text-muted-foreground">Advanced testing of your Supabase database connection and functionality</p>
      </div>

      {/* Overall Status */}
      {results && (
        <Card
          className={`mb-6 ${allTestsPassed ? "border-green-200 bg-green-50" : hasFailures ? "border-red-200 bg-red-50" : "border-orange-200 bg-orange-50"}`}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              {allTestsPassed ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : hasFailures ? (
                <XCircle className="w-6 h-6 text-red-600" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              )}
              <div>
                <h3
                  className={`font-medium ${allTestsPassed ? "text-green-800" : hasFailures ? "text-red-800" : "text-orange-800"}`}
                >
                  {allTestsPassed ? "All Tests Passed" : hasFailures ? "Tests Failed" : "Tests Completed with Warnings"}
                </h3>
                <p
                  className={`text-sm ${allTestsPassed ? "text-green-700" : hasFailures ? "text-red-700" : "text-orange-700"}`}
                >
                  {allTestsPassed
                    ? "All database tests passed successfully"
                    : hasFailures
                      ? "Some tests failed - see details below"
                      : "Tests completed with some issues"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Environment Information */}
      {results && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Environment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium">SUPABASE_URL</p>
                <Badge variant={results.supabaseConfig.url === "Set" ? "default" : "destructive"}>
                  {results.supabaseConfig.url}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium">SUPABASE_ANON_KEY</p>
                <Badge variant={results.supabaseConfig.anonKey === "Set" ? "default" : "destructive"}>
                  {results.supabaseConfig.anonKey}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium">SUPABASE_SERVICE_ROLE_KEY</p>
                <Badge variant={results.supabaseConfig.serviceKey === "Set" ? "default" : "destructive"}>
                  {results.supabaseConfig.serviceKey}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium">NODE_ENV</p>
                <Badge variant="outline">{results.environment.NODE_ENV}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>Detailed results of each database test</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Running comprehensive tests...
            </div>
          ) : results ? (
            <div className="space-y-4">
              {results.tests.map((test, index) => (
                <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                  {getStatusIcon(test.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{test.name}</h4>
                      {getStatusBadge(test.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{test.details}</p>
                    {test.error && (
                      <Alert className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Error Details:</strong> {JSON.stringify(test.error, null, 2)}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No test results available</p>
          )}
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      {hasFailures && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="w-5 h-5" />
              Troubleshooting Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-orange-700">
              <li>• Check that your Supabase project is active and not paused</li>
              <li>• Verify that your database tables are properly created using the SQL scripts</li>
              <li>• Ensure your Supabase service role key has the correct permissions</li>
              <li>• Check if your IP address is allowed in Supabase security settings</li>
              <li>• Verify that Row Level Security (RLS) policies are not blocking access</li>
              <li>• Check Vercel environment variable configuration</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={runTests} disabled={loading}>
          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Run Tests Again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Return to Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
