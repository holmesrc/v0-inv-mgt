"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Check, MessageSquare, TestTube, FileText } from "lucide-react"

export default function MessageComparisonPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)

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
    {
      partNumber: "490-12157-ND",
      description: "CAP KIT CERAMIC 0.1PF-5PF 1000PC",
      supplier: "DIGIKEY",
      location: "H2-59",
      currentStock: 3,
      reorderPoint: 10,
    },
  ]

  const compareMessages = async () => {
    try {
      setLoading(true)
      setResults(null)

      const response = await fetch("/api/debug/compare-messages", {
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
    } catch (error) {
      console.error("Error comparing messages:", error)
      setResults({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const testSimpleAlert = async () => {
    try {
      setLoading(true)

      const response = await fetch("/api/debug/test-simple-alert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: sampleItems,
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert("✅ Simple alert sent successfully! Check your Slack channel.")
      } else {
        alert(`❌ Simple alert failed: ${data.error}`)
      }
    } catch (error) {
      alert(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const testTextOnlyAlert = async () => {
    try {
      setLoading(true)

      const response = await fetch("/api/debug/test-text-only-alert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: sampleItems,
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert("✅ Text-only alert sent successfully! Check your Slack channel.")
      } else {
        alert(`❌ Text-only alert failed: ${data.error}`)
      }
    } catch (error) {
      alert(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const testWorkingMessage = async () => {
    try {
      setLoading(true)

      const response = await fetch("/api/debug/test-slack-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "🧪 This is the working test message format",
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert("✅ Working test message sent successfully! Check your Slack channel.")
      } else {
        alert(`❌ Test message failed: ${data.error}`)
      }
    } catch (error) {
      alert(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const testCleanAlert = async () => {
    try {
      setLoading(true)

      const response = await fetch("/api/debug/test-clean-alert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: sampleItems,
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert("✅ Clean alert sent successfully! Check your Slack channel.")
      } else {
        alert(`❌ Clean alert failed: ${data.error}`)
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
        <h1 className="text-3xl font-bold">Slack Message Debugging</h1>
        <p className="text-muted-foreground">
          Compare working test messages vs failing low stock alerts to identify the issue
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button onClick={compareMessages} disabled={loading} className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Compare Messages
        </Button>

        <Button onClick={testWorkingMessage} disabled={loading} variant="outline" className="flex items-center gap-2">
          <Check className="w-4 h-4" />
          Test Working Message
        </Button>

        <Button onClick={testSimpleAlert} disabled={loading} variant="outline" className="flex items-center gap-2">
          <TestTube className="w-4 h-4" />
          Test Simple Alert
        </Button>

        <Button onClick={testTextOnlyAlert} disabled={loading} variant="outline" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Test Text-Only Alert
        </Button>

        <Button onClick={testCleanAlert} disabled={loading} variant="outline" className="flex items-center gap-2">
          <Check className="w-4 h-4" />
          Test Clean Alert
        </Button>
      </div>

      {results && (
        <div className="space-y-4">
          {results.success ? (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Analysis complete! Check the comparison below to identify potential issues.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Test Message Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-600" />
                      Working Test Message
                    </CardTitle>
                    <CardDescription>This message format works correctly</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <Badge variant="outline">{results.analysis.testMessage.size} chars</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Text Length:</span>
                        <Badge variant="outline">{results.analysis.testMessage.textLength} chars</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Has Blocks:</span>
                        <Badge variant={results.analysis.testMessage.hasBlocks ? "default" : "secondary"}>
                          {results.analysis.testMessage.hasBlocks ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Block Count:</span>
                        <Badge variant="outline">{results.analysis.testMessage.blockCount}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Low Stock Message Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Failing Low Stock Message
                    </CardTitle>
                    <CardDescription>This message format fails to send</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <Badge variant={results.analysis.lowStockMessage.size > 4000 ? "destructive" : "outline"}>
                          {results.analysis.lowStockMessage.size} chars
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Text Length:</span>
                        <Badge variant={results.analysis.lowStockMessage.textLength > 3000 ? "destructive" : "outline"}>
                          {results.analysis.lowStockMessage.textLength} chars
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Has Blocks:</span>
                        <Badge variant={results.analysis.lowStockMessage.hasBlocks ? "default" : "secondary"}>
                          {results.analysis.lowStockMessage.hasBlocks ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Potential Issues */}
              {results.analysis.comparison.potentialIssues.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      Potential Issues Found
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.analysis.comparison.potentialIssues.map((issue: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Message Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Low Stock Message Preview</CardTitle>
                  <CardDescription>First 500 characters of the failing message</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto whitespace-pre-wrap">
                    {results.analysis.lowStockMessage.content.substring(0, 500)}
                    {results.analysis.lowStockMessage.content.length > 500 && "..."}
                  </pre>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {results.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Error: {results.error}</AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}
