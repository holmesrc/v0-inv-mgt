"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Database, RefreshCw } from "lucide-react"

export default function TestSyncPage() {
  const [testResults, setTestResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runSyncTest = async () => {
    setLoading(true)
    setTestResults(null)

    try {
      // Test 1: Check if we have local inventory data
      const localInventory = localStorage.getItem("inventory")
      if (!localInventory) {
        setTestResults({
          success: false,
          step: "local-data-check",
          error: "No inventory data found in localStorage. Please upload inventory first.",
        })
        return
      }

      const inventoryData = JSON.parse(localInventory)
      console.log("Local inventory items:", inventoryData.length)

      // Test 2: Check if Supabase is configured
      console.log("Testing Supabase configuration...")
      const configResponse = await fetch("/api/debug/supabase")
      const configResult = await configResponse.json()

      if (configResult.status !== "success") {
        setTestResults({
          success: false,
          step: "supabase-config",
          error: `Supabase configuration failed: ${configResult.message}`,
          details: configResult,
        })
        return
      }

      // Test 3: Try to sync the data
      console.log("Attempting to sync inventory data...")
      const packageNote = localStorage.getItem("packageNote") || ""

      const syncResponse = await fetch("/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inventory: inventoryData,
          packageNote: packageNote,
          filename: "test-sync.xlsx",
        }),
      })

      console.log("Sync response status:", syncResponse.status)
      const syncResult = await syncResponse.json()
      console.log("Sync result:", syncResult)

      if (!syncResponse.ok) {
        setTestResults({
          success: false,
          step: "sync-operation",
          error: `Sync failed with status ${syncResponse.status}`,
          details: syncResult,
        })
        return
      }

      if (!syncResult.success) {
        setTestResults({
          success: false,
          step: "sync-response",
          error: syncResult.error || "Sync reported failure",
          details: syncResult,
        })
        return
      }

      // Test 4: Verify the data was saved by reading it back
      console.log("Verifying data was saved...")
      const verifyResponse = await fetch("/api/inventory")
      const verifyResult = await verifyResponse.json()

      setTestResults({
        success: true,
        step: "complete",
        localItems: inventoryData.length,
        syncedItems: syncResult.count,
        verifiedItems: verifyResult.success ? verifyResult.count : 0,
        details: {
          sync: syncResult,
          verify: verifyResult,
        },
      })
    } catch (error) {
      console.error("Sync test error:", error)
      setTestResults({
        success: false,
        step: "exception",
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  const clearLocalData = () => {
    localStorage.removeItem("inventory")
    localStorage.removeItem("packageNote")
    localStorage.removeItem("alertSettings")
    alert("Local data cleared. Refresh the page to reload from database.")
  }

  const downloadLogs = () => {
    const logs = {
      testResults,
      localStorage: {
        inventory: localStorage.getItem("inventory") ? "present" : "missing",
        packageNote: localStorage.getItem("packageNote") ? "present" : "missing",
        alertSettings: localStorage.getItem("alertSettings") ? "present" : "missing",
      },
      timestamp: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `sync-test-logs-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Sync Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={runSyncTest} disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
              {loading ? "Testing..." : "Test Database Sync"}
            </Button>
            <Button variant="outline" onClick={clearLocalData}>
              Clear Local Data
            </Button>
            {testResults && (
              <Button variant="outline" onClick={downloadLogs}>
                Download Logs
              </Button>
            )}
          </div>

          {testResults && (
            <Card className={testResults.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <CardHeader>
                <CardTitle
                  className={`flex items-center gap-2 ${testResults.success ? "text-green-800" : "text-red-800"}`}
                >
                  {testResults.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  {testResults.success ? "Sync Test Passed" : "Sync Test Failed"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Badge variant={testResults.success ? "default" : "destructive"}>
                      Failed at step: {testResults.step}
                    </Badge>
                  </div>

                  {testResults.error && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        <strong>Error:</strong> {testResults.error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {testResults.success && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <strong>Local Items:</strong> {testResults.localItems}
                      </div>
                      <div>
                        <strong>Synced Items:</strong> {testResults.syncedItems}
                      </div>
                      <div>
                        <strong>Verified Items:</strong> {testResults.verifiedItems}
                      </div>
                    </div>
                  )}

                  {testResults.details && (
                    <div>
                      <strong>Technical Details:</strong>
                      <pre className="mt-2 p-3 bg-white rounded border text-xs overflow-auto max-h-40">
                        {JSON.stringify(testResults.details, null, 2)}
                      </pre>
                    </div>
                  )}

                  {testResults.stack && (
                    <div>
                      <strong>Stack Trace:</strong>
                      <pre className="mt-2 p-3 bg-white rounded border text-xs overflow-auto max-h-40">
                        {testResults.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <h3 className="font-medium text-blue-800 mb-2">How to Use This Test:</h3>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Make sure you have inventory data loaded (upload an Excel file first if needed)</li>
            <li>2. Click "Test Database Sync" to run the full sync test</li>
            <li>3. If it fails, check the error message and technical details</li>
            <li>4. Use "Download Logs" to save detailed information for debugging</li>
            <li>5. "Clear Local Data" forces the app to reload from the database</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
