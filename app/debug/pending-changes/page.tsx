"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle, Check, RefreshCw, Send, Trash2, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PendingChange {
  id: string
  change_type: string
  item_data?: any
  original_data?: any
  requested_by?: string
  status: string
  created_at: string
  part_number?: string
  description?: string
}

export default function PendingChangesDebug() {
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedChanges, setSelectedChanges] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [slackTestResult, setSlackTestResult] = useState<any>(null)

  // Load pending changes on mount
  useEffect(() => {
    loadPendingChanges()
  }, [])

  // Function to safely extract data from various object structures
  const safeExtract = (change: PendingChange, field: string) => {
    // Direct field access (newer format)
    if (field in change) {
      return change[field as keyof PendingChange]
    }

    // Check item_data (for add/update)
    if (change.item_data && field in change.item_data) {
      return change.item_data[field]
    }

    // Check original_data (for delete)
    if (change.original_data && field in change.original_data) {
      return change.original_data[field]
    }

    // Special case for part number
    if (field === "part_number" && change.item_data?.part_number) {
      return change.item_data.part_number
    }

    // Special case for description
    if (field === "description") {
      return (
        change.description ||
        change.item_data?.part_description ||
        change.item_data?.description ||
        change.original_data?.part_description ||
        change.original_data?.description ||
        "N/A"
      )
    }

    return "N/A"
  }

  // Load pending changes from the API
  const loadPendingChanges = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/debug/pending-changes")
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || "Failed to load pending changes")
      }

      setPendingChanges(result.data || [])
    } catch (error) {
      console.error("Error loading pending changes:", error)
      setError(`Error loading pending changes: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle checkbox change
  const handleCheckboxChange = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedChanges((prev) => [...prev, id])
    } else {
      setSelectedChanges((prev) => prev.filter((changeId) => changeId !== id))
    }
  }

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedChanges(pendingChanges.map((change) => change.id))
    } else {
      setSelectedChanges([])
    }
  }

  // Update status of selected changes
  const updateStatus = async (status: string, processChanges = false, sendNotification = false) => {
    if (selectedChanges.length === 0) {
      setError("No changes selected")
      return
    }

    try {
      setProcessing(true)
      setError(null)
      setResult(null)

      const response = await fetch("/api/debug/pending-changes", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedChanges,
          status,
          processChanges,
          sendNotification,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || "Failed to update status")
      }

      setResult(result)
      loadPendingChanges() // Reload the list
      setSelectedChanges([]) // Clear selection
    } catch (error) {
      console.error("Error updating status:", error)
      setError(`Error updating status: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setProcessing(false)
    }
  }

  // Delete selected changes
  const deleteSelected = async () => {
    if (selectedChanges.length === 0) {
      setError("No changes selected")
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedChanges.length} changes?`)) {
      return
    }

    try {
      setProcessing(true)
      setError(null)
      setResult(null)

      const response = await fetch("/api/debug/pending-changes", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedChanges,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || "Failed to delete changes")
      }

      setResult(result)
      loadPendingChanges() // Reload the list
      setSelectedChanges([]) // Clear selection
    } catch (error) {
      console.error("Error deleting changes:", error)
      setError(`Error deleting changes: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setProcessing(false)
    }
  }

  // Test Slack webhook
  const testSlackWebhook = async () => {
    try {
      setProcessing(true)
      setSlackTestResult(null)

      const response = await fetch("/api/debug/test-slack")
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || "Failed to send test message")
      }

      setSlackTestResult({
        success: true,
        message: "Test message sent to Slack successfully",
      })
    } catch (error) {
      console.error("Error testing Slack webhook:", error)
      setSlackTestResult({
        success: false,
        error: `Error testing Slack webhook: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setProcessing(false)
    }
  }

  // Send approval notifications for selected changes
  const sendApprovalNotifications = async () => {
    if (selectedChanges.length === 0) {
      setError("No changes selected")
      return
    }

    try {
      setProcessing(true)
      setError(null)
      setResult(null)

      const response = await fetch("/api/debug/pending-changes", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedChanges,
          status: "pending", // Keep the same status
          sendNotification: true,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || "Failed to send notifications")
      }

      setResult(result)
    } catch (error) {
      console.error("Error sending notifications:", error)
      setError(`Error sending notifications: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setProcessing(false)
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString()
    } catch (e) {
      return dateString
    }
  }

  // Get status badge class
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs font-medium"
      case "rejected":
        return "bg-red-100 text-red-800 px-2 py-1 rounded-md text-xs font-medium"
      case "pending":
        return "bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md text-xs font-medium"
      case "processing":
        return "bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-medium"
      case "failed":
        return "bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs font-medium"
      default:
        return "bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs font-medium"
    }
  }

  // Get change type badge class
  const getChangeTypeBadge = (type: string) => {
    switch (type) {
      case "add":
        return "bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs font-medium"
      case "delete":
        return "bg-red-100 text-red-800 px-2 py-1 rounded-md text-xs font-medium"
      case "update":
        return "bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-medium"
      default:
        return "bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs font-medium"
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Pending Changes Debug</CardTitle>
          <CardDescription>
            View and manage all pending changes in the database. Use this page to clean up stuck changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Result Alert */}
          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertDescription>
                {result.message}
                {result.processResults && (
                  <div className="mt-2">
                    <p className="font-medium">Processing Results:</p>
                    <ul className="list-disc pl-5 text-sm">
                      {result.processResults.map((r: any, i: number) => (
                        <li key={i} className={r.success ? "text-green-600" : "text-red-600"}>
                          {r.id}: {r.success ? r.message : r.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.notificationResults && (
                  <div className="mt-2">
                    <p className="font-medium">Notification Results:</p>
                    <ul className="list-disc pl-5 text-sm">
                      {result.notificationResults.map((r: any, i: number) => (
                        <li key={i} className={r.success ? "text-green-600" : "text-red-600"}>
                          {r.id}: {r.success ? r.message : r.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Slack Test Result */}
          {slackTestResult && (
            <Alert variant={slackTestResult.success ? "default" : "destructive"}>
              {slackTestResult.success ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertDescription>{slackTestResult.message || slackTestResult.error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => loadPendingChanges()}
              variant="outline"
              disabled={loading}
              className="flex items-center gap-1"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button
              onClick={() => updateStatus("approved", true)}
              variant="default"
              disabled={selectedChanges.length === 0 || processing}
              className="flex items-center gap-1"
            >
              <Check className="h-4 w-4" />
              Approve & Process Changes
            </Button>
            <Button
              onClick={() => updateStatus("approved", false)}
              variant="outline"
              disabled={selectedChanges.length === 0 || processing}
              className="flex items-center gap-1"
            >
              <Check className="h-4 w-4" />
              Mark as Approved
            </Button>
            <Button
              onClick={() => updateStatus("rejected", false)}
              variant="outline"
              disabled={selectedChanges.length === 0 || processing}
              className="flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Mark as Rejected
            </Button>
            <Button
              onClick={deleteSelected}
              variant="destructive"
              disabled={selectedChanges.length === 0 || processing}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected
            </Button>
            <Button
              onClick={sendApprovalNotifications}
              variant="outline"
              disabled={selectedChanges.length === 0 || processing}
              className="flex items-center gap-1"
            >
              <Send className="h-4 w-4" />
              Send Approval Notifications
            </Button>
            <Button
              onClick={testSlackWebhook}
              variant="outline"
              disabled={processing}
              className="flex items-center gap-1"
            >
              <Send className="h-4 w-4" />
              Test Slack Webhook
            </Button>
          </div>

          {/* Pending Changes Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedChanges.length === pendingChanges.length && pendingChanges.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Loading...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pendingChanges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      No pending changes found
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingChanges.map((change) => (
                    <TableRow key={change.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedChanges.includes(change.id)}
                          onCheckedChange={(checked) => handleCheckboxChange(change.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{change.id.substring(0, 8)}...</TableCell>
                      <TableCell>
                        <span className={getChangeTypeBadge(change.change_type)}>{change.change_type}</span>
                      </TableCell>
                      <TableCell>{safeExtract(change, "part_number")}</TableCell>
                      <TableCell className="max-w-xs truncate">{safeExtract(change, "description")}</TableCell>
                      <TableCell>{change.requested_by || "N/A"}</TableCell>
                      <TableCell>
                        <span className={getStatusBadge(change.status)}>{change.status}</span>
                      </TableCell>
                      <TableCell>{formatDate(change.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
