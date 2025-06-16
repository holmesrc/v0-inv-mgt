"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Check, RefreshCw, Bug, Zap } from "lucide-react"

export default function DeploymentTestPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [functionCheck, setFunctionCheck] = useState<any>(null)

  // Sample low stock items for testing
  const sampleItems = [
    {
      partNumber: "NTF5P03T3GOSCT-ND",
      description: "MOSFET P-CH 30V 3.7A SOT223",
      supplier: "DIGIKEY",
      location: "H3-174",
      currentStock: 5,
      reorderPoint: 10,
    },
    {
      partNumber: "490-12158-ND",
      description: "CAP KIT CER 5.1PF-47PF 1260PCS",
      supplier: "DIGIKEY",
      location: "H2-58",
      currentStock: 2,
      reorderPoint: 10,
    },
  ]

  const testDeployedAlert = async () => {
    try {
      setLoading(true)
      setResults(null)

      console.log("Testing deployed alert...")

      const response = await fetch("/api/debug/test-deployed-alert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: sampleItems,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setResults(data)

      if (data.success) {
        alert("✅ Deployed alert test completed! Check results below and your Slack channel.")
      } else {
        alert(`❌ Deployed alert test failed: ${data.error}`)
      }
    } catch (error) {
      console.error("Error testing deployed alert:", error)
      setResults({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const checkFunctionVersions = async () => {
    try {
      setLoading(true)
      setFunctionCheck(null)

      const response = await fetch("/api/debug/check-function-versions", {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setFunctionCheck(data)
    } catch (error) {
      console.error("Error checking function versions:", error)
      setFunctionCheck({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const testDashboardAlert = async () => {
    try {
      setLoading(true)

      // Call the same endpoint the dashboard uses
      const formattedItems = sampleItems.map((item) => ({
        partNumber: item.partNumber,
        description: item.description,
        supplier: item.supplier,
        location: item.location,
        currentStock: item.currentStock,
        reorderPoint: item.reorderPoint,
      }))

      // This simulates what the dashboard does
      const response = await fetch("/api/slack/send-full-alert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: formattedItems,
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert("✅ Dashboard-style alert sent successfully! Check your Slack channel.")
      } else {
        alert(`❌ Dashboard-style alert failed: ${data.error}`)
      }
    } catch (error) {
      alert(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Deployment Debugging</h1>
        <p className="text-muted-foreground">
          Test the deployed version to see exactly what's happening with Slack alerts
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button onClick={checkFunctionVersions} disabled={loading} className="flex items-center gap-2">
          <Bug className="w-4 h-4" />
          Check Function Versions
        </Button>

        <Button onClick={testDeployedAlert} disabled={loading} variant="outline" className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Test Deployed Alert
        </Button>

        <Button onClick={testDashboardAlert} disabled={loading} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Test Dashboard Alert
        </Button>
      </div>

      {/* Function Check Results */}
      {functionCheck && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5" />
              Function Version Check
            </CardTitle>
            <CardDescription>Checking what functions are actually deployed</CardDescription>
          </CardHeader>
          <CardContent>
            {functionCheck.success ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Clean Message Length</h4>
                    <Badge variant={functionCheck.analysis.cleanMessageLength > 0 ? "default" : "destructive"}>
                      {functionCheck.analysis.cleanMessageLength} chars
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Has Emojis</h4>
                    <Badge variant={functionCheck.analysis.cleanMessageHasEmojis ? "destructive" : "default"}>
                      {functionCheck.analysis.cleanMessageHasEmojis ? "Yes (Bad)" : "No (Good)"}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Has Shortcuts</h4>
                    <Badge variant={functionCheck.analysis.cleanMessageHasShortcuts ? "destructive" : "default"}>
                      {functionCheck.analysis.cleanMessageHasShortcuts ? "Yes (Bad)" : "No (Good)"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Function Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(functionCheck.functionCheck).map(([func, status]) => (
                      <div key={func} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm font-mono">{func}</span>
                        <Badge
                          variant={typeof status === "string" && status.includes("Error") ? "destructive" : "default"}
                        >
                          {typeof status === "string"
                            ? status.length > 30
                              ? status.substring(0, 30) + "..."
                              : status
                            : "OK"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {functionCheck.functionCheck.createCleanLowStockAlertMessage &&
                  typeof functionCheck.functionCheck.createCleanLowStockAlertMessage === "string" && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Clean Message Preview</h4>
                      <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto whitespace-pre-wrap">
                        {functionCheck.functionCheck.createCleanLowStockAlertMessage.substring(0, 300)}...
                      </pre>
                    </div>
                  )}
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Error: {functionCheck.error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {results.success ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              Deployed Alert Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.success ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Direct Send Test</h4>
                    <Badge variant={results.tests.directSend ? "default" : "destructive"}>
                      {results.tests.directSend ? "Success" : "Failed"}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Dashboard Send Test</h4>
                    <Badge variant={results.tests.dashboardSend ? "default" : "destructive"}>
                      {results.tests.dashboardSend ? "Success" : "Failed"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Message Details</h4>
                  <div className="flex gap-4">
                    <span>
                      Length: <Badge variant="outline">{results.messageLength} chars</Badge>
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Message Preview</h4>
                  <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto whitespace-pre-wrap">
                    {results.messagePreview}
                  </pre>
                </div>

                {results.directResult && !results.directResult.success && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>Direct send error: {results.directResult.error}</AlertDescription>
                  </Alert>
                )}

                {results.dashboardResult && !results.dashboardResult.success && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>Dashboard send error: {results.dashboardResult.error}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Test failed at step: {results.step || "unknown"}
                  <br />
                  Error: {results.error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
