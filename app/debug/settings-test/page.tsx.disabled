"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, RefreshCw, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

export default function SettingsTestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runTest = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/settings-test")
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        logs: ["Error running test"],
      })
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
        <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">Settings API Test</h1>
        <p className="text-muted-foreground">Diagnose issues with the settings API</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Settings API Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Running settings tests...
            </div>
          ) : result ? (
            <div className="space-y-4">
              <Alert variant={result.success ? "default" : "destructive"}>
                <AlertDescription className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span>
                    <strong>{result.success ? "Success:" : "Error:"}</strong> {result.message || result.error}
                  </span>
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle>Detailed Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-auto">
                    {result.logs?.map((log: string, index: number) => (
                      <div key={index} className="mb-1">
                        {log}
                      </div>
                    )) || "No logs available"}
                  </div>
                </CardContent>
              </Card>

              {result.details && (
                <Alert>
                  <AlertDescription>
                    <strong>Additional Details:</strong> {result.details}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <p>No test results available</p>
          )}

          <div className="mt-4">
            <Button onClick={runTest} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Running Test...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Run Test Again
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Manual Fix Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            If the tests above fail, you can manually fix the settings table by running the SQL script below in your
            Supabase SQL Editor:
          </p>

          <div className="bg-gray-900 text-blue-400 p-4 rounded font-mono text-sm overflow-auto mb-4">
            {`-- Create settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for the settings table
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- Insert default settings if they don't exist
INSERT INTO settings (key, value)
VALUES ('alert_settings', '{"enabled":true,"dayOfWeek":1,"time":"09:00","defaultReorderPoint":10}'::jsonb)
ON CONFLICT (key) DO NOTHING;`}
          </div>

          <Alert>
            <AlertDescription>
              After running the SQL script, come back to this page and click "Run Test Again" to verify the fix.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
