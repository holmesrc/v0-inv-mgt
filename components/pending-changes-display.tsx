"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertCircle } from "lucide-react"

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

  useEffect(() => {
    loadPendingChanges()

    // Poll for updates every 30 seconds
    const interval = setInterval(loadPendingChanges, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadPendingChanges = async () => {
    try {
      const response = await fetch("/api/inventory/pending")
      const result = await response.json()

      if (result.success) {
        setPendingChanges(result.data)
      }
    } catch (error) {
      console.error("Error loading pending changes:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return null
  }

  if (pendingChanges.length === 0) {
    return null
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-600" />
          Pending Changes
        </CardTitle>
        <CardDescription>
          {pendingChanges.length} change{pendingChanges.length !== 1 ? "s" : ""} awaiting approval
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingChanges.map((change) => (
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
                    {change.change_type === "add" &&
                      `${change.item_data?.part_number} - ${change.item_data?.part_description}`}
                    {change.change_type === "delete" &&
                      `${change.original_data?.part_number} - ${change.original_data?.part_description}`}
                    {change.change_type === "update" &&
                      `${change.original_data?.part_number} - ${change.original_data?.part_description}`}
                  </div>
                  <div className="text-xs text-gray-500">
                    Requested by {change.requested_by} • {new Date(change.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <Badge variant="secondary">Pending Approval</Badge>
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
