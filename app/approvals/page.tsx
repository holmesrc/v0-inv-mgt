"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, ArrowLeft, Package } from "lucide-react"
import Link from "next/link"

interface PendingChange {
  id: string
  change_type: "add" | "update" | "delete" | "batch_add"
  item_data: any
  original_data: any
  requested_by: string
  description: string
  status: "pending" | "approved" | "rejected"
  created_at: string
  approved_by?: string
  approved_at?: string
}

export default function ApprovalsPage() {
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)

  useEffect(() => {
    loadPendingChanges()
  }, [])

  const loadPendingChanges = async () => {
    try {
      setLoading(true)
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

  const handleApproval = async (changeId: string, action: "approve" | "reject") => {
    try {
      setProcessingId(changeId)
      setError(null)

      const response = await fetch("/api/inventory/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changeId,
          action,
          approvedBy: "Admin User", // You can make this dynamic
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Reload the pending changes
        await loadPendingChanges()
        alert(`✅ Change ${action}d successfully!`)
      } else {
        setError(result.error || `Failed to ${action} change`)
      }
    } catch (error) {
      console.error(`Error ${action}ing change:`, error)
      setError(`Failed to ${action} change`)
    } finally {
      setProcessingId(null)
    }
  }

  const handleBulkApproval = async (action: "approve" | "reject") => {
    if (selectedIds.size === 0) {
      alert("Please select at least one item to process")
      return
    }

    const confirmMessage = `Are you sure you want to ${action} ${selectedIds.size} selected item${selectedIds.size > 1 ? "s" : ""}?`
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      setBulkProcessing(true)
      setError(null)

      const promises = Array.from(selectedIds).map(async (changeId) => {
        const response = await fetch("/api/inventory/approve", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            changeId,
            action,
            approvedBy: "Admin User",
          }),
        })
        return response.json()
      })

      const results = await Promise.all(promises)
      const failures = results.filter((result) => !result.success)

      if (failures.length === 0) {
        alert(`✅ Successfully ${action}d ${selectedIds.size} item${selectedIds.size > 1 ? "s" : ""}!`)
        setSelectedIds(new Set())
        await loadPendingChanges()
      } else {
        setError(`${failures.length} item${failures.length > 1 ? "s" : ""} failed to ${action}. Please try again.`)
        await loadPendingChanges()
      }
    } catch (error) {
      console.error(`Error bulk ${action}ing:`, error)
      setError(`Failed to ${action} selected items`)
    } finally {
      setBulkProcessing(false)
    }
  }

  const handleSelectAll = () => {
    const pendingItems = pendingChanges.filter((change) => change.status === "pending")
    if (selectedIds.size === pendingItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingItems.map((change) => change.id)))
    }
  }

  const handleSelectItem = (changeId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(changeId)) {
      newSelected.delete(changeId)
    } else {
      newSelected.add(changeId)
    }
    setSelectedIds(newSelected)
  }

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case "add":
        return "bg-green-100 text-green-800"
      case "batch_add":
        return "bg-green-100 text-green-800"
      case "update":
        return "bg-blue-100 text-blue-800"
      case "delete":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const formatChangeDetails = (change: PendingChange) => {
    const { change_type, item_data, original_data } = change

    if (change_type === "batch_add") {
      const batchItems = item_data?.batch_items || []
      return (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span className="font-medium">Batch Addition ({batchItems.length} items)</span>
          </div>
          <div className="bg-green-50 p-2 rounded max-h-32 overflow-y-auto">
            {batchItems.slice(0, 5).map((item: any, index: number) => (
              <div key={index} className="text-green-700 text-xs">
                • {item.part_number} - {item.part_description} (Qty: {item.qty})
              </div>
            ))}
            {batchItems.length > 5 && (
              <div className="text-green-600 text-xs mt-1">+ {batchItems.length - 5} more items...</div>
            )}
          </div>
          <div className="text-xs text-gray-500">
            Total Quantity: {batchItems.reduce((sum: number, item: any) => sum + (item.qty || 0), 0)}
          </div>
        </div>
      )
    }

    if (change_type === "add") {
      return (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>
                <strong>Part Number:</strong> {item_data?.part_number}
              </p>
              <p>
                <strong>MFG Part:</strong> {item_data?.mfg_part_number || "N/A"}
              </p>
              <p>
                <strong>Supplier:</strong> {item_data?.supplier || "N/A"}
              </p>
            </div>
            <div>
              <p>
                <strong>Quantity:</strong> {item_data?.qty}
              </p>
              <p>
                <strong>Package:</strong> {item_data?.package || "N/A"}
              </p>
              <p>
                <strong>Location:</strong> {item_data?.location}
              </p>
            </div>
          </div>
          <p>
            <strong>Description:</strong> {item_data?.part_description}
          </p>
          <p>
            <strong>Reorder Point:</strong> {item_data?.reorder_point || "Not set"}
          </p>
        </div>
      )
    }

    if (change_type === "update") {
      const changes = []
      if (original_data?.qty !== item_data?.qty) {
        changes.push(`Quantity: ${original_data?.qty} → ${item_data?.qty}`)
      }
      if (original_data?.reorder_point !== item_data?.reorder_point) {
        changes.push(
          `Reorder Point: ${original_data?.reorder_point || "Not set"} → ${item_data?.reorder_point || "Not set"}`,
        )
      }
      if (original_data?.location !== item_data?.location) {
        changes.push(`Location: ${original_data?.location} → ${item_data?.location}`)
      }
      if (original_data?.supplier !== item_data?.supplier) {
        changes.push(`Supplier: ${original_data?.supplier || "N/A"} → ${item_data?.supplier || "N/A"}`)
      }
      if (original_data?.package !== item_data?.package) {
        changes.push(`Package: ${original_data?.package || "N/A"} → ${item_data?.package || "N/A"}`)
      }

      return (
        <div className="space-y-2 text-sm">
          <p>
            <strong>Part Number:</strong> {original_data?.part_number}
          </p>
          <p>
            <strong>Description:</strong> {original_data?.part_description}
          </p>
          <div className="bg-blue-50 p-2 rounded">
            <p className="font-medium text-blue-800 mb-1">Changes:</p>
            {changes.map((change, index) => (
              <p key={index} className="text-blue-700">
                • {change}
              </p>
            ))}
          </div>
        </div>
      )
    }

    if (change_type === "delete") {
      return (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>
                <strong>Part Number:</strong> {original_data?.part_number}
              </p>
              <p>
                <strong>MFG Part:</strong> {original_data?.mfg_part_number || "N/A"}
              </p>
              <p>
                <strong>Supplier:</strong> {original_data?.supplier || "N/A"}
              </p>
            </div>
            <div>
              <p>
                <strong>Current Quantity:</strong> {original_data?.qty}
              </p>
              <p>
                <strong>Package:</strong> {original_data?.package || "N/A"}
              </p>
              <p>
                <strong>Location:</strong> {original_data?.location}
              </p>
            </div>
          </div>
          <p>
            <strong>Description:</strong> {original_data?.part_description}
          </p>
          <div className="bg-red-50 p-2 rounded">
            <p className="text-red-800 font-medium">⚠️ This item will be permanently deleted</p>
          </div>
        </div>
      )
    }

    return null
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading pending changes...</p>
        </div>
      </div>
    )
  }

  const pendingCount = pendingChanges.filter((c) => c.status === "pending").length
  const approvedCount = pendingChanges.filter((c) => c.status === "approved").length
  const rejectedCount = pendingChanges.filter((c) => c.status === "rejected").length
  const pendingItems = pendingChanges.filter((c) => c.status === "pending")

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Approval Dashboard</h1>
          <p className="text-muted-foreground">Manage pending inventory changes and approvals</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadPendingChanges} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Inventory
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button variant="outline" size="sm" className="ml-2" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Changes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingChanges.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {pendingCount > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.size === pendingItems.length && pendingItems.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  Bulk Actions
                </CardTitle>
                <CardDescription>
                  {selectedIds.size} of {pendingCount} pending items selected
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleBulkApproval("approve")}
                  disabled={selectedIds.size === 0 || bulkProcessing}
                  variant="default"
                >
                  {bulkProcessing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Approve Selected ({selectedIds.size})
                </Button>
                <Button
                  onClick={() => handleBulkApproval("reject")}
                  disabled={selectedIds.size === 0 || bulkProcessing}
                  variant="destructive"
                >
                  {bulkProcessing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Reject Selected ({selectedIds.size})
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Pending Changes Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Changes</CardTitle>
          <CardDescription>Review and manage inventory changes</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingChanges.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No changes found.</p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.size === pendingItems.length && pendingItems.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingChanges.map((change) => (
                    <TableRow key={change.id} className={change.status === "pending" ? "bg-yellow-50" : ""}>
                      <TableCell>
                        {change.status === "pending" && (
                          <Checkbox
                            checked={selectedIds.has(change.id)}
                            onCheckedChange={() => handleSelectItem(change.id)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(change.status)}
                          <Badge
                            variant={
                              change.status === "pending"
                                ? "secondary"
                                : change.status === "approved"
                                  ? "default"
                                  : "destructive"
                            }
                          >
                            {change.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getChangeTypeColor(change.change_type)}>
                          {change.change_type === "batch_add" ? "BATCH ADD" : change.change_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md">{formatChangeDetails(change)}</TableCell>
                      <TableCell>{change.requested_by}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(change.created_at).toLocaleDateString()}
                          <br />
                          <span className="text-muted-foreground">
                            {new Date(change.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {change.status === "pending" ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApproval(change.id, "approve")}
                              disabled={processingId === change.id}
                            >
                              {processingId === change.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleApproval(change.id, "reject")}
                              disabled={processingId === change.id}
                            >
                              {processingId === change.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {change.status === "approved" ? "✅ Approved" : "❌ Rejected"}
                            {change.approved_by && (
                              <>
                                <br />
                                by {change.approved_by}
                              </>
                            )}
                            {change.approved_at && (
                              <>
                                <br />
                                {new Date(change.approved_at).toLocaleDateString()}
                              </>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
