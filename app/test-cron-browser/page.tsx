"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestCronBrowser() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testCron = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/alerts/test-cron', {
        headers: {
          'Authorization': 'Bearer dst-inventory-alerts-2025-holmesrc'
        }
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' })
    }
    setLoading(false)
  }

  const testSimple = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/alerts/test-simple')
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' })
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>DST Automation Cron Test</CardTitle>
          <CardDescription>
            Test your Monday 9 AM Eastern inventory alerts system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={testSimple} disabled={loading}>
              {loading ? "Testing..." : "Test Simple (No Auth)"}
            </Button>
            <Button onClick={testCron} disabled={loading}>
              {loading ? "Testing..." : "Test Cron (With Auth)"}
            </Button>
          </div>
          
          {result && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Test Result:</h3>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
