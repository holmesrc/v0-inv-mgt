"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Package,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import ProtectedApprovals from "@/components/protected-approvals"

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
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())

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

  const handleBatchItemStatusChange = async (batchId: string, itemIndex: number, status: "approved" | "rejected") => {
    try {
      setProcessingId(`${batchId}-${itemIndex}`)
      setError(null)

      const response = await fetch("/api/inventory/batch-item-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          batchId,
          itemIndex,
          status,
          approvedBy: "Admin User",
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Reload the data to reflect changes
        await loadPendingChanges()
        alert(`✅ Item ${status} successfully!`)
      } else {
        setError(result.error || `Failed to ${status} item`)
      }
    } catch (error) {
      console.error(`Error ${status}ing item:`, error)
      setError(`Failed to ${status} item`)
    } finally {
      setProcessingId(null)
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
          approvedBy: "Admin User",
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Add a small delay to ensure database update is complete
        setTimeout(async () => {
          await loadPendingChanges()
          alert(`✅ Change ${action}d successfully!`)
        }, 500)
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

  const toggleBatchExpansion = (batchId: string) => {
    const newExpanded = new Set(expandedBatches)
    if (newExpanded.has(batchId)) {
      newExpanded.delete(batchId)
    } else {
      newExpanded.add(batchId)
    }
    setExpandedBatches(newExpanded)
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

  const getDisplayChangeType = (change: PendingChange) => {
    const actionType = change.item_data?.action_type || change.change_type
    
    switch (actionType) {
      case "edit_item":
        return { type: "UPDATE", color: "bg-blue-100 text-blue-800" }
      case "delete_item":
        return { type: "DELETE", color: "bg-red-100 text-red-800" }
      case "add_item":
        return { type: "ADD", color: "bg-green-100 text-green-800" }
      case "batch_add":
        return { type: "BATCH ADD", color: "bg-green-100 text-green-800" }
      default:
        return { type: change.change_type.toUpperCase(), color: getChangeTypeColor(change.change_type) }
    }
  }

  const getDisplayChangeType = (change: PendingChange) => {
    const actionType = change.item_data?.action_type || change.change_type
    
    switch (actionType) {
      case "edit_item":
        return { type: "UPDATE", color: "bg-blue-100 text-blue-800" }
      case "delete_item":
        return { type: "DELETE", color: "bg-red-100 text-red-800" }
      case "add_item":
        return { type: "ADD", color: "bg-green-100 text-green-800" }
      case "batch_add":
        return { type: "BATCH ADD", color: "bg-green-100 text-green-800" }
      default:
        return { type: change.change_type.toUpperCase(), color: getChangeTypeColor(change.change_type) }
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

  const getItemStatus = (change: PendingChange, itemIndex: number) => {
    return change.item_data?.item_statuses?.[itemIndex] || "pending"
  }

  const renderBatchItems = (change: PendingChange) => {
    const batchItems = change.item_data?.batch_items || []
    const isExpanded = expandedBatches.has(change.id)

    // Count statuses
    const statusCounts = { pending: 0, approved: 0, rejected: 0 }
    batchItems.forEach((_: any, index: number) => {
      const status = getItemStatus(change, index)
      statusCounts[status as keyof typeof statusCounts]++
    })

    return (
      <>
        {/* Batch Summary Row */}
        <TableRow key={change.id} className={change.status === "pending" ? "bg-yellow-50" : ""}>
          <TableCell>
            {change.status === "pending" && (
              <Checkbox checked={selectedIds.has(change.id)} onCheckedChange={() => handleSelectItem(change.id)} />
            )}
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              {getStatusIcon(change.status)}
              <Badge
                variant={
                  change.status === "pending" ? "secondary" : change.status === "approved" ? "default" : "destructive"
                }
              >
                {change.status}
              </Badge>
            </div>
          </TableCell>
          <TableCell>
            <Badge className={getChangeTypeColor("batch_add")}>BATCH ADD</Badge>
          </TableCell>
          <TableCell className="max-w-md">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => toggleBatchExpansion(change.id)} className="p-1 h-6 w-6">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
              <Package className="w-4 h-4" />
              <span className="font-medium">Batch Addition ({batchItems.length} items)</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              <div>Total Quantity: {batchItems.reduce((sum: number, item: any) => sum + (item.qty || 0), 0)}</div>
              <div className="flex gap-4 mt-1">
                <span className="text-yellow-600">Pending: {statusCounts.pending}</span>
                <span className="text-green-600">Approved: {statusCounts.approved}</span>
                <span className="text-red-600">Rejected: {statusCounts.rejected}</span>
              </div>
            </div>
          </TableCell>
          <TableCell>{change.requested_by}</TableCell>
          <TableCell>
            <div className="text-sm">
              {new Date(change.created_at).toLocaleDateString()}
              <br />
              <span className="text-muted-foreground">{new Date(change.created_at).toLocaleTimeString()}</span>
            </div>
          </TableCell>
          <TableCell>
            {change.status === "pending" ? (
              <div className="flex flex-col gap-2">
                <div className="text-xs text-gray-600 mb-2">
                  <strong>Batch Actions:</strong>
                  <br />
                  Approve = Approve all pending items
                  <br />
                  Reject = Reject entire batch
                </div>
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
                    Approve Batch
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
                    Reject Batch
                  </Button>
                </div>
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
              </div>
            )}
          </TableCell>
        </TableRow>

        {/* Individual Batch Items */}
        {isExpanded &&
          batchItems.map((item: any, index: number) => {
            const itemStatus = getItemStatus(change, index)
            const itemProcessingId = `${change.id}-${index}`

            return (
              <TableRow key={`${change.id}-item-${index}`} className="bg-blue-50 border-l-4 border-l-blue-300">
                <TableCell className="pl-8">
                  <div className="w-4 h-4 rounded-full bg-blue-200 flex items-center justify-center">
                    <span className="text-xs text-blue-600">{index + 1}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(itemStatus)}
                    <Badge
                      variant={
                        itemStatus === "pending" ? "secondary" : itemStatus === "approved" ? "default" : "destructive"
                      }
                    >
                      {itemStatus}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className="bg-blue-100 text-blue-800">ITEM</Badge>
                </TableCell>
                <TableCell className="max-w-md">
                  <div className="space-y-1 text-sm">
                    <div className="font-medium">{item.part_number}</div>
                    <div className="text-gray-600">{item.part_description}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <span>Qty: {item.qty}</span>
                      <span>Supplier: {item.supplier}</span>
                      <span>Location: {item.location}</span>
                      <span>Package: {item.package}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-500">—</TableCell>
                <TableCell className="text-sm text-gray-500">—</TableCell>
                <TableCell>
                  {change.status === "pending" && itemStatus === "pending" ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBatchItemStatusChange(change.id, index, "approved")}
                        disabled={processingId === itemProcessingId}
                        className="h-7 px-2 text-xs"
                      >
                        {processingId === itemProcessingId ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBatchItemStatusChange(change.id, index, "rejected")}
                        disabled={processingId === itemProcessingId}
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                      >
                        {processingId === itemProcessingId ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {itemStatus === "approved"
                        ? "✅ Approved"
                        : itemStatus === "rejected"
                          ? "❌ Rejected"
                          : "⏳ Pending"}
                      {itemStatus === "approved" && <div className="text-green-600">Added to inventory</div>}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
      </>
    )
  }

  const formatChangeDetails = (change: PendingChange) => {
    const { change_type, item_data, original_data } = change
    
    // Check action_type first (for new operations), then fall back to change_type
    const actionType = item_data?.action_type || change_type

    if (actionType === "edit_item") {
      // Handle edit operations - show changes
      const currentData = item_data?.current_data
      const proposedChanges = item_data?.proposed_changes
      
      if (!currentData || !proposedChanges) {
        return <div className="text-sm text-gray-500">Edit data not available</div>
      }

      const changes = []
      
      // Check each field for changes
      if (currentData['Part number'] !== proposedChanges.partNumber) {
        changes.push({
          field: 'Part Number',
          old: currentData['Part number'],
          new: proposedChanges.partNumber
        })
      }
      
      if ((currentData['MFG Part number'] || '') !== (proposedChanges.mfgPartNumber || '')) {
        changes.push({
          field: 'MFG Part Number',
          old: currentData['MFG Part number'] || 'N/A',
          new: proposedChanges.mfgPartNumber || 'N/A'
        })
      }
      
      if (currentData['Part description'] !== proposedChanges.description) {
        changes.push({
          field: 'Description',
          old: currentData['Part description'],
          new: proposedChanges.description
        })
      }
      
      if (currentData.QTY !== parseInt(proposedChanges.quantity)) {
        changes.push({
          field: 'Quantity',
          old: currentData.QTY,
          new: parseInt(proposedChanges.quantity)
        })
      }
      
      if (currentData.Location !== proposedChanges.location) {
        changes.push({
          field: 'Location',
          old: currentData.Location,
          new: proposedChanges.location
        })
      }
      
      if (currentData.Supplier !== proposedChanges.supplier) {
        changes.push({
          field: 'Supplier',
          old: currentData.Supplier,
          new: proposedChanges.supplier
        })
      }
      
      if (currentData.Package !== proposedChanges.package) {
        changes.push({
          field: 'Package',
          old: currentData.Package,
          new: proposedChanges.package
        })
      }
      
      if ((currentData.reorderPoint || 10) !== parseInt(proposedChanges.reorderPoint)) {
        changes.push({
          field: 'Reorder Point',
          old: currentData.reorderPoint || 10,
          new: parseInt(proposedChanges.reorderPoint)
        })
      }

      return (
        <div className="space-y-2 text-sm">
          <div className="font-medium text-blue-800 mb-2">
            Changes for: {currentData['Part number'] || "Unknown Part"}
          </div>
          {changes.length > 0 ? (
            changes.map((change, index) => (
              <div key={index} className="border-l-2 border-blue-200 pl-3 py-1">
                <div className="font-medium text-gray-700">{change.field}:</div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded">From: {change.old}</span>
                  <span className="text-gray-400">→</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded">To: {change.new}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-gray-500 italic">No changes detected</div>
          )}
        </div>
      )
    }

    if (actionType === "delete_item") {
      // Handle delete operations
      const currentData = item_data?.current_data
      
      return (
        <div className="space-y-2 text-sm">
          <div className="font-medium text-red-800 mb-2">Deleting: {currentData?.['Part number'] || "Unknown Part"}</div>
          <div className="grid grid-cols-2 gap-4 text-gray-600">
            <div>
              <p>
                <strong>Part Number:</strong> {currentData?.['Part number'] || "N/A"}
              </p>
              <p>
                <strong>MFG Part:</strong> {currentData?.['MFG Part number'] || "N/A"}
              </p>
              <p>
                <strong>Supplier:</strong> {currentData?.Supplier || "N/A"}
              </p>
            </div>
            <div>
              <p>
                <strong>Quantity:</strong> {currentData?.QTY || "N/A"}
              </p>
              <p>
                <strong>Package:</strong> {currentData?.Package || "N/A"}
              </p>
              <p>
                <strong>Location:</strong> {currentData?.Location || "N/A"}
              </p>
            </div>
          </div>
          <p>
            <strong>Description:</strong> {currentData?.['Part description'] || "N/A"}
          </p>
        </div>
      )
    }

    if (actionType === "add_item" || change_type === "add") {
      return (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>
                <strong>Part Number:</strong> {item_data?.part_number || "N/A"}
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
                <strong>Quantity:</strong> {item_data?.qty || "N/A"}
              </p>
              <p>
                <strong>Package:</strong> {item_data?.package || "N/A"}
              </p>
              <p>
                <strong>Location:</strong> {item_data?.location || "N/A"}
              </p>
            </div>
          </div>
          <p>
            <strong>Description:</strong> {item_data?.part_description || "N/A"}
          </p>
          <p>
            <strong>Reorder Point:</strong> {item_data?.reorder_point || "Not set"}
          </p>
        </div>
      )
    }

    if (change_type === "update") {
      const changes = []
      const fields = [
        { key: "part_number", label: "Part Number" },
        { key: "mfg_part_number", label: "MFG Part" },
        { key: "part_description", label: "Description" },
        { key: "supplier", label: "Supplier" },
        { key: "qty", label: "Quantity" },
        { key: "package", label: "Package" },
        { key: "location", label: "Location" },
        { key: "reorder_point", label: "Reorder Point" },
        { key: "requester", label: "Requester" },
      ]

      fields.forEach((field) => {
        const oldValue = original_data?.[field.key]
        const newValue = item_data?.[field.key]

        if (oldValue !== newValue) {
          changes.push({
            field: field.label,
            old: oldValue || "N/A",
            new: newValue || "N/A",
          })
        }
      })

      if (changes.length === 0) {
        return (
          <div className="text-sm text-gray-500">
            <p>No changes detected</p>
          </div>
        )
      }

      return (
        <div className="space-y-2 text-sm">
          <div className="font-medium text-blue-800 mb-2">
            Changes for: {original_data?.part_number || item_data?.part_number || "Unknown Part"}
          </div>
          {changes.map((change, index) => (
            <div key={index} className="border-l-2 border-blue-200 pl-3 py-1">
              <div className="font-medium text-gray-700">{change.field}:</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded">From: {change.old}</span>
                <span className="text-gray-400">→</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">To: {change.new}</span>
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (change_type === "delete") {
      return (
        <div className="space-y-2 text-sm">
          <div className="font-medium text-red-800 mb-2">Deleting: {original_data?.part_number || "Unknown Part"}</div>
          <div className="grid grid-cols-2 gap-4 text-gray-600">
            <div>
              <p>
                <strong>Part Number:</strong> {original_data?.part_number || "N/A"}
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
                <strong>Quantity:</strong> {original_data?.qty || "N/A"}
              </p>
              <p>
                <strong>Package:</strong> {original_data?.package || "N/A"}
              </p>
              <p>
                <strong>Location:</strong> {original_data?.location || "N/A"}
              </p>
            </div>
          </div>
          <p>
            <strong>Description:</strong> {original_data?.part_description || "N/A"}
          </p>
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
    <ProtectedApprovals>
      <div className="container mx-auto p-6 space-y-6">
        {/* All existing content stays the same */}
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

        {/* Batch Approval Instructions */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Batch Approval Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-700">
            <div className="space-y-2">
              <p>
                <strong>Batch Actions:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong>Approve Batch:</strong> Approves all pending items in the batch and adds them to inventory
                </li>
                <li>
                  <strong>Reject Batch:</strong> Rejects the entire batch (no items are added)
                </li>
              </ul>
              <p>
                <strong>Individual Item Actions:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong>Approve Item:</strong> Immediately adds that specific item to inventory
                </li>
                <li>
                  <strong>Reject Item:</strong> Marks that item as rejected (won't be added)
                </li>
                <li>Use individual actions when you want to approve some items but not others</li>
              </ul>
            </div>
          </CardContent>
        </Card>

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
            <CardDescription>
              Review and manage inventory changes. Click the arrow to expand batch items for individual approval.
            </CardDescription>
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
                    {pendingChanges.map((change) => {
                      const isBatch = change.item_data?.is_batch === true

                      if (isBatch) {
                        return renderBatchItems(change)
                      }

                      // Regular non-batch items
                      return (
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
                            {(() => {
                              const displayType = getDisplayChangeType(change)
                              return (
                                <Badge className={displayType.color}>
                                  {displayType.type}
                                </Badge>
                              )
                            })()}
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
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedApprovals>
  )
}
