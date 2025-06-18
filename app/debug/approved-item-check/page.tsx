"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Search, AlertTriangle, CheckCircle } from "lucide-react"

export default function ApprovedItemCheckPage() {
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const runDebugCheck = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/debug/approved-item-check", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      })

      const result = await response.json()

      if (result.success) {
        setDebugInfo(result)
      } else {
        setError(result.error || "Failed to run debug check")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Approved Item Debug Check</h1>
          <p className="text-muted-foreground">Debug tool to find missing approved items</p>
        </div>
        <Button onClick={runDebugCheck} disabled={loading}>
          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
          {loading ? "Checking..." : "Run Debug Check"}
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {debugInfo && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Debug Summary
              </CardTitle>
              <CardDescription>Overview of search results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{debugInfo.summary.items_at_location}</div>
                  <div className="text-sm text-muted-foreground">Items at H3-187</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{debugInfo.summary.specific_part_found}</div>
                  <div className="text-sm text-muted-foreground">Specific Part Found</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{debugInfo.summary.recent_approvals}</div>
                  <div className="text-sm text-muted-foreground">Recent Approvals</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{debugInfo.summary.total_recent_items}</div>
                  <div className="text-sm text-muted-foreground">Recent Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-teal-600">{debugInfo.summary.similar_parts}</div>
                  <div className="text-sm text-muted-foreground">Similar Parts</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items at H3-187 */}
          <Card>
            <CardHeader>
              <CardTitle>Items at Location H3-187</CardTitle>
              <CardDescription>All inventory items found at location H3-187</CardDescription>
            </CardHeader>
            <CardContent>
              {debugInfo.debug_info.items_at_h3_187.length > 0 ? (
                <div className="space-y-2">
                  {debugInfo.debug_info.items_at_h3_187.map((item: any, index: number) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="font-medium">{item.part_number}</div>
                      <div className="text-sm text-muted-foreground">{item.part_description}</div>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span>Qty: {item.qty}</span>
                        <span>Supplier: {item.supplier}</span>
                        <span>Package: {item.package}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No items found at location H3-187</p>
              )}
            </CardContent>
          </Card>

          {/* Specific Part Search */}
          <Card>
            <CardHeader>
              <CardTitle>Specific Part Search (81-GJM0336C1E150GB1D)</CardTitle>
              <CardDescription>Search results for the approved part number</CardDescription>
            </CardHeader>
            <CardContent>
              {debugInfo.debug_info.specific_part_search.length > 0 ? (
                <div className="space-y-2">
                  {debugInfo.debug_info.specific_part_search.map((item: any, index: number) => (
                    <div key={index} className="p-3 border rounded-lg bg-green-50">
                      <div className="font-medium text-green-800">{item.part_number}</div>
                      <div className="text-sm text-green-700">{item.part_description}</div>
                      <div className="flex gap-4 mt-2 text-xs text-green-600">
                        <span>Qty: {item.qty}</span>
                        <span>Location: {item.location}</span>
                        <span>Supplier: {item.supplier}</span>
                        <span>Package: {item.package}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 border rounded-lg bg-red-50">
                  <p className="text-red-700 font-medium">❌ Part not found in inventory!</p>
                  <p className="text-sm text-red-600">
                    The approved part 81-GJM0336C1E150GB1D is not in the inventory table.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Approved Changes */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Approved Changes</CardTitle>
              <CardDescription>Last 10 approved changes from the pending_changes table</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {debugInfo.debug_info.recent_approved_changes.map((change: any, index: number) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge variant="outline" className="mb-2">
                          {change.change_type}
                        </Badge>
                        <div className="text-sm">
                          <strong>Requested by:</strong> {change.requested_by}
                        </div>
                        <div className="text-sm">
                          <strong>Approved by:</strong> {change.approved_by}
                        </div>
                        <div className="text-sm">
                          <strong>Approved at:</strong> {new Date(change.approved_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">ID: {change.id}</div>
                    </div>
                    {change.item_data && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                        <pre>{JSON.stringify(change.item_data, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Inventory Items */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Inventory Items</CardTitle>
              <CardDescription>Last 20 items added to inventory</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {debugInfo.debug_info.recent_inventory_items.map((item: any, index: number) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="font-medium">{item.part_number}</div>
                    <div className="text-sm text-muted-foreground">{item.part_description}</div>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span>Qty: {item.qty}</span>
                      <span>Location: {item.location}</span>
                      <span>Supplier: {item.supplier}</span>
                      <span>ID: {item.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
