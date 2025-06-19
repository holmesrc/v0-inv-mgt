"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

export default function PendingLocationsDebugPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchDebugData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/debug/pending-locations")
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || "Failed to fetch debug data")
      }
    } catch (err) {
      setError("Network error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pending Locations Debug</h1>
        <Button onClick={fetchDebugData} disabled={loading}>
          {loading ? "Fetching..." : "Fetch Debug Data"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {data && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{data.debugInfo.totalChanges}</div>
                  <div className="text-sm text-muted-foreground">Total Pending Changes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{data.debugInfo.processedChanges.length}</div>
                  <div className="text-sm text-muted-foreground">Processed Changes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{data.extractedLocations.length}</div>
                  <div className="text-sm text-muted-foreground">Extracted Locations</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Extracted Locations */}
          <Card>
            <CardHeader>
              <CardTitle>Extracted Locations</CardTitle>
            </CardHeader>
            <CardContent>
              {data.extractedLocations.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {data.extractedLocations.map((location: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      {location}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground">No locations extracted</div>
              )}
            </CardContent>
          </Card>

          {/* Data Structure Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Data Structure Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.debugInfo.dataStructureAnalysis.slice(0, 3).map((analysis: any, index: number) => (
                  <div key={index} className="border rounded p-4">
                    <div className="font-medium mb-2">
                      Change {index + 1} (ID: {analysis.id})
                    </div>
                    <div className="text-sm space-y-1">
                      <div>
                        <strong>item_data type:</strong> {analysis.item_data_type}
                      </div>
                      <div>
                        <strong>item_data keys:</strong>{" "}
                        {analysis.item_data_keys ? analysis.item_data_keys.join(", ") : "null"}
                      </div>
                      <div className="mt-2">
                        <strong>Raw item_data:</strong>
                        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(analysis.item_data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Processing Results */}
          <Card>
            <CardHeader>
              <CardTitle>Processing Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.debugInfo.processedChanges.slice(0, 5).map((change: any, index: number) => (
                  <div key={index} className="border rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">Change {index + 1}</div>
                      <Badge variant={change.extractedFromThis.length > 0 ? "default" : "secondary"}>
                        {change.extractedFromThis.length} locations
                      </Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>
                        <strong>ID:</strong> {change.id}
                      </div>
                      <div>
                        <strong>Type:</strong> {change.changeType}
                      </div>
                      <div>
                        <strong>Has item_data:</strong> {change.hasItemData ? "Yes" : "No"}
                      </div>
                      <div>
                        <strong>Has batch_items:</strong> {change.hasBatchItems ? "Yes" : "No"}
                      </div>
                      <div>
                        <strong>Has direct location:</strong> {change.hasDirectLocation ? "Yes" : "No"}
                      </div>
                      <div>
                        <strong>item_data keys:</strong> {change.itemDataKeys.join(", ")}
                      </div>
                      {change.extractedFromThis.length > 0 && (
                        <div>
                          <strong>Extracted:</strong> {change.extractedFromThis.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Raw Data Sample */}
          <Card>
            <CardHeader>
              <CardTitle>Raw Data Sample</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(data.pendingChanges.slice(0, 2), null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
