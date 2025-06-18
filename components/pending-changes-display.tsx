"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertCircle, Package } from "lucide-react"

interface PendingChange {
  id: string
  change_type: string
  item_data: any
  original_data: any
  requested_by: string
  status: string
  created_at: string
}

export default function PendingChangesDisplay() {
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPendingChanges()

    // Poll for updates every 30 seconds
    const interval = setInterval(loadPendingChanges, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadPendingChanges = async () => {
    try {
      setError(null)
      const response = await fetch("/api/inventory/pending")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        setPendingChanges(result.data)
      } else {
        setError(result.error || "Failed to load pending changes")
      }
    } catch (error) {
      console.error("Error loading pending changes:", error)
      setError(error instanceof Error ? error.message : "Failed to load pending changes")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 animate-spin" />
            <span className="text-sm text-gray-600">Loading pending changes...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-600">Error: {error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const activePendingChanges = pendingChanges.filter((change) => change.status === "pending")

  if (activePendingChanges.length === 0) {
    return null
  }

  const renderChangeDetails = (change: PendingChange) => {
    if (change.change_type === "batch_add") {
      const batchItems = change.item_data?.batch_items || []
      return (
        <div>
          <div className="font-medium flex items-center gap-2">
            <Package className="w-4 h-4" />
            Batch Addition ({batchItems.length} items)
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {batchItems.slice(0, 3).map((item: any, index: number) => (
              <div key={index}>
                • {item.part_number} - {item.part_description} (Qty: {item.qty})
              </div>
            ))}
            {batchItems.length > 3 && (
              <div className="text-xs text-gray-500 mt-1">+ {batchItems.length - 3} more items...</div>
            )}
          </div>
        </div>
      )
    }

    // Handle individual changes
    return (
      <div>
        <div className="font-medium">
          {change.change_type === "add" && "Add New Item"}
          {change.change_type === "delete" && "Delete Item"}
          {change.change_type === "update" && "Update Item"}
        </div>
        <div className="text-sm text-gray-600">
          {change.change_type === "add" && `${change.item_data?.part_number} - ${change.item_data?.part_description}`}
          {change.change_type === "delete" &&
            `${change.original_data?.part_number} - ${change.original_data?.part_description}`}
          {change.change_type === "update" &&
            `${change.original_data?.part_number} - ${change.original_data?.part_description}`}
        </div>
      </div>
    )
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-600" />
          Pending Changes
        </CardTitle>
        <CardDescription>
          {activePendingChanges.length} change{activePendingChanges.length !== 1 ? "s" : ""} awaiting approval
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`space-y-3 ${activePendingChanges.length > 3 ? "max-h-64 overflow-y-auto pr-2" : ""}`}>
          {activePendingChanges.map((change) => (
            <div key={change.id} className="flex items-start justify-between p-3 bg-white rounded border">
              <div className="flex items-start gap-3 flex-1">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  {renderChangeDetails(change)}
                  <div className="text-xs text-gray-500 mt-2">
                    Requested by {change.requested_by} • {new Date(change.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="ml-2 flex-shrink-0">
                Pending Approval
              </Badge>
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-blue-800">
          <strong>Note:</strong> These changes have been sent to the inventory alerts channel for approval. They will be
          applied to the database once approved by an authorized user.
        </div>
      </CardContent>
    </Card>
  )
}
