"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ShoppingCart, Clock, CheckCircle, XCircle, MessageSquare, RefreshCw } from "lucide-react"
import Link from "next/link"

interface ReorderRequest {
  id: string
  partNumber: string
  description: string
  quantity: number
  requester: string
  urgency: string
  timeframe: string
  notes?: string
  status: 'pending' | 'approved' | 'ordered' | 'received' | 'denied'
  submittedAt: string
  updatedAt?: string
  statusNotes?: string
}

export default function ReorderStatusPage() {
  const [requests, setRequests] = useState<ReorderRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<ReorderRequest | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [statusNotes, setStatusNotes] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    loadReorderRequests()
  }, [])

  const loadReorderRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/reorder-requests')
      const result = await response.json()
      
      if (result.success) {
        setRequests(result.requests || [])
      } else {
        console.error('Failed to load reorder requests:', result.error)
      }
    } catch (error) {
      console.error('Error loading reorder requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const openStatusModal = (request: ReorderRequest) => {
    setSelectedRequest(request)
    setNewStatus(request.status)
    setStatusNotes(request.statusNotes || '')
    setIsModalOpen(true)
  }

  const updateStatus = async () => {
    if (!selectedRequest) return

    try {
      const response = await fetch('/api/reorder-requests/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          status: newStatus,
          statusNotes: statusNotes
        })
      })

      const result = await response.json()

      if (result.success) {
        await loadReorderRequests() // Reload the list
        setIsModalOpen(false)
        setSelectedRequest(null)
        alert('✅ Status updated and requester notified!')
      } else {
        alert('❌ Failed to update status: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('❌ Error updating status')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, icon: Clock, color: "text-yellow-600" },
      approved: { variant: "default" as const, icon: CheckCircle, color: "text-blue-600" },
      ordered: { variant: "default" as const, icon: ShoppingCart, color: "text-purple-600" },
      received: { variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
      denied: { variant: "destructive" as const, icon: XCircle, color: "text-red-600" }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getUrgencyBadge = (urgency: string) => {
    const urgencyConfig = {
      Critical: { variant: "destructive" as const, emoji: "🔴" },
      High: { variant: "destructive" as const, emoji: "🟠" },
      Medium: { variant: "secondary" as const, emoji: "🟡" },
      Low: { variant: "outline" as const, emoji: "🟢" }
    }

    const config = urgencyConfig[urgency as keyof typeof urgencyConfig] || urgencyConfig.Medium

    return (
      <Badge variant={config.variant}>
        {config.emoji} {urgency}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading reorder requests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reorder Request Status</h1>
          <p className="text-muted-foreground">Manage and track all reorder requests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadReorderRequests}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link href="/">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Reorder Requests</CardTitle>
          <CardDescription>
            {requests.length} total requests | Click on any request to update its status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No reorder requests found</p>
              <Link href="/low-stock">
                <Button className="mt-4">Create First Request</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell className="font-mono font-medium">{request.partNumber}</TableCell>
                    <TableCell>{request.description}</TableCell>
                    <TableCell>{request.quantity} units</TableCell>
                    <TableCell>{request.requester}</TableCell>
                    <TableCell>{getUrgencyBadge(request.urgency)}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{new Date(request.submittedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openStatusModal(request)}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Update
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Status Update Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Request Status</DialogTitle>
            <DialogDescription>
              Update the status and notify the requester
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Request Details</h4>
                <div className="text-sm space-y-1">
                  <div><strong>Part:</strong> {selectedRequest.partNumber}</div>
                  <div><strong>Quantity:</strong> {selectedRequest.quantity} units</div>
                  <div><strong>Requester:</strong> {selectedRequest.requester}</div>
                  <div><strong>Current Status:</strong> {getStatusBadge(selectedRequest.status)}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">New Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">⏳ Pending Review</SelectItem>
                    <SelectItem value="approved">✅ Approved</SelectItem>
                    <SelectItem value="ordered">🛒 Ordered</SelectItem>
                    <SelectItem value="received">📦 Received</SelectItem>
                    <SelectItem value="denied">❌ Denied</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Status Notes (sent to requester)</label>
                <Textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Add notes about this status update..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateStatus}>
              Update Status & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
