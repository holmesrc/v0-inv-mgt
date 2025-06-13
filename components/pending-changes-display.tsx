"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PendingChange {
  id: string
  change_type: string
  part_number: string
  description: string
  current_stock: number
  supplier: string
  location: string
  package: string
  requester: string
  status: string
  created_at: string
  // Legacy fields for backward compatibility
  item_data?: any
  original_data?: any
  requested_by?: string
}

export default function PendingChangesDisplay() {
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadPendingChanges()

    // Poll for updates every 30 seconds
    const interval = setInterval(loadPendingChanges, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadPendingChanges = async () => {
    try {
      setRefreshing(true)
      const response = await fetch("/api/inventory/pending")

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        // Filter only pending changes
        const pending = (result.data || []).filter((change: PendingChange) => change.status === "pending")
        setPendingChanges(pending)
        setError(null)
      } else {
        throw new Error(result.error || "Failed to load pending changes")
      }
    } catch (error) {
      console.error("Error loading pending changes:", error)
      setError(error instanceof Error ? error.message : "Unknown error")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadPendingChanges()
  }

  if (loading) {
    return (
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400 animate-spin" />
            <span className="text-sm text-gray-600">Loading pending changes...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">Error loading pending changes: {error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (pendingChanges.length === 0) {
    return null
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            Pending Changes
          </CardTitle>
          <CardDescription>
            {pendingChanges.length} change{pendingChanges.length !== 1 ? "s" : ""} awaiting approval
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingChanges.map((change) => {
            // Handle both new and legacy data structures
            const partNumber =
              change.part_number || change.item_data?.part_number || change.original_data?.part_number || "Unknown"
            const description =
              change.description ||
              change.item_data?.part_description ||
              change.original_data?.part_description ||
              "No description"
            const requester = change.requester || change.requested_by || "Unknown"

            return (
              <div key={change.id} className="flex items-center justify-between p-3 bg-white rounded border">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <div>
                    <div className="font-medium">
                      {change.change_type === "add" && "Add New Item"}
                      {change.change_type === "delete" && "Delete Item"}
                      {change.change_type === "update" && "Update Item"}
                    </div>
                    <div className="text-sm text-gray-600">
                      {partNumber} - {description}
                    </div>
                    <div className="text-xs text-gray-500">
                      Requested by {requester} • {new Date(change.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary">Pending Approval</Badge>
              </div>
            )
          })}
        </div>
        <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-blue-800">
          <strong>Note:</strong> These changes have been sent to the inventory alerts channel for approval. They will be
          applied to the database once approved by an authorized user.
        </div>
      </CardContent>
    </Card>
  )
}
