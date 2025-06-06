"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Database, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function DetailedSyncPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runDetailedSync = async () => {
    setLoading(true)
    setResult(null)

    try {
      // Get inventory from localStorage
      const localInventory = localStorage.getItem("inventory")
      const packageNote = localStorage.getItem("packageNote") || ""

      if (!localInventory) {
        setResult({
          success: false,
          error: "No local inventory data found. Please upload inventory first.",
          logs: [],
        })
        return
      }

      const inventory = JSON.parse(localInventory)

      const response = await fetch("/api/debug/detailed-sync-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventory, packageNote }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        logs: [],
      })
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
        <h1 className="text-3xl font-bold">Detailed Sync Debug</h1>
        <p className="text-muted-foreground">Step-by-step sync debugging with detailed logs</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Run Detailed Sync Test</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runDetailedSync} disabled={loading} className="mb-4">
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Running Detailed Sync...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Run Detailed Sync
              </>
            )}
          </Button>

          {result && (
            <div className="space-y-4">
              <Alert variant={result.success ? "default" : "destructive"}>
                <AlertDescription>
                  <strong>Result:</strong> {result.success ? "SUCCESS" : "FAILED"}
                  <br />
                  <strong>Message:</strong> {result.error || result.message}
                </AlertDescription>
              </Alert>

              {result.success && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <Badge variant="outline">Items Processed</Badge>
                    <div className="text-2xl font-bold">{result.itemsProcessed || 0}</div>
                  </div>
                  <div className="text-center">
                    <Badge variant="outline">Items Inserted</Badge>
                    <div className="text-2xl font-bold">{result.itemsInserted || 0}</div>
                  </div>
                  <div className="text-center">
                    <Badge variant="outline">Final Count</Badge>
                    <div className="text-2xl font-bold">{result.finalCount || 0}</div>
                  </div>
                </div>
              )}

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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
