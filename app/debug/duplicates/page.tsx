"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, RefreshCw, Trash2, Search, AlertTriangle, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function DuplicatesPage() {
  const [checkResult, setCheckResult] = useState<any>(null)
  const [cleanupResult, setCleanupResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [cleaning, setCleaning] = useState(false)

  const runDuplicateCheck = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/duplicate-check")
      const data = await response.json()
      setCheckResult(data)
    } catch (error) {
      setCheckResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const cleanDuplicates = async () => {
    if (!confirm("Are you sure you want to clean duplicates? This will delete duplicate entries permanently.")) {
      return
    }

    setCleaning(true)
    try {
      const response = await fetch("/api/debug/clean-duplicates", { method: "POST" })
      const data = await response.json()
      setCleanupResult(data)

      // Refresh the check after cleanup
      if (data.success) {
        setTimeout(() => runDuplicateCheck(), 1000)
      }
    } catch (error) {
      setCleanupResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setCleaning(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold mb-2">Duplicate Inventory Check</h1>
        <p className="text-muted-foreground">Identify and clean duplicate inventory entries</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Duplicate Detection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Button onClick={runDuplicateCheck} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Check for Duplicates
                </>
              )}
            </Button>

            {checkResult?.duplicateCount > 0 && (
              <Button onClick={cleanDuplicates} disabled={cleaning} variant="destructive">
                {cleaning ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Cleaning...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clean Duplicates
                  </>
                )}
              </Button>
            )}
          </div>

          {checkResult && (
            <div className="space-y-4">
              <Alert variant={checkResult.success ? "default" : "destructive"}>
                <AlertDescription className="flex items-center gap-2">
                  {checkResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  )}
                  <span>
                    <strong>{checkResult.success ? "Check Complete" : "Check Failed"}:</strong>{" "}
                    {checkResult.error || "Duplicate check completed"}
                  </span>
                </AlertDescription>
              </Alert>

              {checkResult.success && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold">{checkResult.totalItems}</div>
                    <div className="text-sm text-muted-foreground">Total Items</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold">{checkResult.uniquePartNumbers}</div>
                    <div className="text-sm text-muted-foreground">Unique Parts</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-red-500">{checkResult.duplicateCount}</div>
                    <div className="text-sm text-muted-foreground">Duplicated Parts</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-orange-500">{checkResult.recentDuplicateCount}</div>
                    <div className="text-sm text-muted-foreground">Recent Duplicates</div>
                  </div>
                </div>
              )}

              {checkResult.duplicateDetails && checkResult.duplicateDetails.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Duplicate Details (First 10)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {checkResult.duplicateDetails.map((dup: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <span className="font-medium">{dup.partNumber}</span>
                            <Badge variant="destructive" className="ml-2">
                              {dup.count} copies
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            IDs: {dup.ids.slice(0, 3).join(", ")}
                            {dup.ids.length > 3 && "..."}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {checkResult.logs && (
                <Card>
                  <CardHeader>
                    <CardTitle>Check Logs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-60 overflow-auto">
                      {checkResult.logs.map((log: string, index: number) => (
                        <div key={index} className="mb-1">
                          {log}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {cleanupResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Cleanup Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant={cleanupResult.success ? "default" : "destructive"} className="mb-4">
              <AlertDescription className="flex items-center gap-2">
                {cleanupResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                )}
                <span>
                  <strong>{cleanupResult.success ? "Cleanup Complete" : "Cleanup Failed"}:</strong>{" "}
                  {cleanupResult.message || cleanupResult.error}
                </span>
              </AlertDescription>
            </Alert>

            {cleanupResult.success && (
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-green-500">{cleanupResult.itemsKept}</div>
                  <div className="text-sm text-muted-foreground">Items Kept</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-red-500">{cleanupResult.itemsDeleted}</div>
                  <div className="text-sm text-muted-foreground">Items Deleted</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold">{cleanupResult.finalCount}</div>
                  <div className="text-sm text-muted-foreground">Final Count</div>
                </div>
              </div>
            )}

            {cleanupResult.logs && (
              <Card>
                <CardHeader>
                  <CardTitle>Cleanup Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-60 overflow-auto">
                    {cleanupResult.logs.map((log: string, index: number) => (
                      <div key={index} className="mb-1">
                        {log}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How Duplicates Happen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Common causes of inventory duplicates:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Multiple syncs without clearing existing data first</li>
              <li>Uploading the same Excel file multiple times</li>
              <li>Adding items manually that already exist in the database</li>
              <li>Network issues causing duplicate API calls</li>
              <li>Browser refresh during sync operations</li>
            </ul>
            <p className="mt-4">
              <strong>Prevention:</strong> The cleanup tool keeps the most recently created version of each part number.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
