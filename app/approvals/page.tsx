"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface PendingChange {
  id: string
  change_type: "add" | "update" | "delete"
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

  useEffect(() => {
    loadPendingChanges()
  }, [])

  const loadPendingChanges = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/inventory/pending")
      const result = await response.json()

      if (result.success) {
        setPendingChanges(result.data)
      } else {
        setError(result.error || "Failed to load pending changes")
      }
    } catch (error) {
      console.error("Error loading pending changes:", error)
      setError("Failed to load pending changes")
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

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case "add":
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

    if (change_type === "add") {
      return (
        <div className="space-y-1">
          <p>
            <strong>Part Number:</strong> {item_data?.part_number}
          </p>
          <p>
            <strong>Description:</strong> {item_data?.part_description}
          </p>
          <p>
            <strong>Quantity:</strong> {item_data?.qty}
          </p>
          <p>
            <strong>Location:</strong> {item_data?.location}
          </p>
        </div>
      )
    }

    if (change_type === "update") {
      return (
        <div className="space-y-1">
          <p>
            <strong>Part Number:</strong> {original_data?.part_number}
          </p>
          {original_data?.qty !== item_data?.qty && (
            <p>
              <strong>Quantity:</strong> {original_data?.qty} → {item_data?.qty}
            </p>
          )}
          {original_data?.reorder_point !== item_data?.reorder_point && (
            <p>
              <strong>Reorder Point:</strong> {original_data?.reorder_point} → {item_data?.reorder_point}
            </p>
          )}
        </div>
      )
    }

    if (change_type === "delete") {
      return (
        <div className="space-y-1">
          <p>
            <strong>Part Number:</strong> {original_data?.part_number}
          </p>
          <p>
            <strong>Description:</strong> {original_data?.part_description}
          </p>
          <p>
            <strong>Current Quantity:</strong> {original_data?.qty}
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

      {/* Pending Changes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Changes</CardTitle>
          <CardDescription>Review and approve or deny inventory changes</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingChanges.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No pending changes found.</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingChanges.map((change) => (
                    <TableRow key={change.id}>
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
                          {change.change_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={change.description}>
                          {change.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatChangeDetails(change)}</div>
                      </TableCell>
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
