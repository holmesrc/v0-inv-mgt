"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw } from "lucide-react"

interface PendingChange {
  id: string
  change_type: string
  part_number: string
  description: string
  current_stock?: number
  min_stock?: number
  supplier?: string
  location?: string
  package?: string
  requested_by: string
  created_at: string
  status: string
}

export default function RequestsApprovalPage() {
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  const fetchPendingChanges = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/inventory/pending")

      if (!response.ok) {
        throw new Error(`Failed to fetch pending changes: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setPendingChanges(data.data || [])
      } else {
        throw new Error(data.error || "Failed to fetch pending changes")
      }
    } catch (error) {
      console.error("Error fetching pending changes:", error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingChanges()
  }, [])

  const handleAction = async (changeId: string, action: "approve" | "reject") => {
    try {
      setActionLoading(changeId)
      setResult(null)

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

      if (!response.ok) {
        throw new Error(`Failed to ${action} change: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || `Failed to ${action} change`)
      }

      setResult({
        success: true,
        message: `Change ${action}d successfully`,
      })

      // Refresh the pending changes list
      await fetchPendingChanges()
    } catch (error) {
      console.error(`Error ${action}ing change:`, error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case "add":
        return "bg-green-100 text-green-800"
      case "delete":
        return "bg-red-100 text-red-800"
      case "update":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading pending changes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory Change Requests</h1>
          <p className="text-muted-foreground">
            {pendingChanges.length} pending change{pendingChanges.length !== 1 ? "s" : ""} awaiting approval
          </p>
        </div>
        <Button onClick={fetchPendingChanges} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
          <AlertDescription>{result.success ? result.message : result.error}</AlertDescription>
        </Alert>
      )}

      {pendingChanges.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Pending Changes</h3>
            <p className="text-muted-foreground">All inventory changes have been processed.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pending Changes</CardTitle>
            <CardDescription>Review and approve or reject inventory changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Part Number</TableHead>
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
                        <Badge className={getChangeTypeColor(change.change_type)}>
                          {change.change_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{change.part_number}</TableCell>
                      <TableCell>{change.description}</TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {change.current_stock !== undefined && <div>Stock: {change.current_stock}</div>}
                          {change.supplier && <div>Supplier: {change.supplier}</div>}
                          {change.location && <div>Location: {change.location}</div>}
                          {change.package && <div>Package: {change.package}</div>}
                        </div>
                      </TableCell>
                      <TableCell>{change.requested_by}</TableCell>
                      <TableCell>{formatDate(change.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAction(change.id, "approve")}
                            disabled={actionLoading === change.id}
                          >
                            {actionLoading === change.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleAction(change.id, "reject")}
                            disabled={actionLoading === change.id}
                          >
                            {actionLoading === change.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
