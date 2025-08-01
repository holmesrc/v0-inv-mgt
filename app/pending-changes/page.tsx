"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle, XCircle, Clock, Eye, MessageSquare, RefreshCw, FileText } from "lucide-react"
import Link from "next/link"

interface PendingChange {
  id: string
  change_type: 'add' | 'update' | 'delete'
  status: 'pending' | 'approved' | 'denied'
  item_data: any
  original_data?: any
  requested_by: string
  request_date: string
  reviewed_by?: string
  review_date?: string
  review_notes?: string
}

export default function PendingChangesPage() {
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChange, setSelectedChange] = useState<PendingChange | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'deny'>('approve')

  useEffect(() => {
    loadPendingChanges()
  }, [])

  const loadPendingChanges = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/inventory/pending')
      const result = await response.json()
      
      if (result.success) {
        setPendingChanges(result.data || [])
      } else {
        console.error('Failed to load pending changes:', result.error)
      }
    } catch (error) {
      console.error('Error loading pending changes:', error)
    } finally {
      setLoading(false)
    }
  }

  const openReviewModal = (change: PendingChange, action: 'approve' | 'deny') => {
    setSelectedChange(change)
    setReviewAction(action)
    setReviewNotes('')
    setIsReviewModalOpen(true)
  }

  const submitReview = async () => {
    if (!selectedChange) return

    try {
      const response = await fetch('/api/inventory/pending/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          changeId: selectedChange.id,
          action: reviewAction,
          notes: reviewNotes
        })
      })

      const result = await response.json()

      if (result.success) {
        await loadPendingChanges() // Reload the list
        setIsReviewModalOpen(false)
        setSelectedChange(null)
        alert(`✅ Change ${reviewAction}d successfully!`)
      } else {
        alert('❌ Failed to process review: ' + result.error)
      }
    } catch (error) {
      console.error('Error submitting review:', error)
      alert('❌ Error submitting review')
    }
  }

  const batchApprove = async () => {
    const pendingItems = pendingChanges.filter(change => change.status === 'pending')
    
    if (pendingItems.length === 0) {
      alert('No pending changes to approve')
      return
    }

    if (!confirm(`Are you sure you want to approve all ${pendingItems.length} pending changes?`)) {
      return
    }

    try {
      const response = await fetch('/api/inventory/pending/batch-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          changeIds: pendingItems.map(change => change.id),
          action: 'approve',
          notes: 'Batch approval'
        })
      })

      const result = await response.json()

      if (result.success) {
        await loadPendingChanges()
        alert(`✅ Successfully approved ${pendingItems.length} changes!`)
      } else {
        alert('❌ Failed to batch approve: ' + result.error)
      }
    } catch (error) {
      console.error('Error in batch approval:', error)
      alert('❌ Error in batch approval')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, icon: Clock, color: "text-yellow-600" },
      approved: { variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
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

  const getChangeTypeBadge = (changeType: string) => {
    const typeConfig = {
      add: { variant: "default" as const, color: "bg-green-100 text-green-800", label: "Add" },
      update: { variant: "secondary" as const, color: "bg-blue-100 text-blue-800", label: "Update" },
      delete: { variant: "destructive" as const, color: "bg-red-100 text-red-800", label: "Delete" }
    }

    const config = typeConfig[changeType as keyof typeof typeConfig] || typeConfig.add

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    )
  }

  const formatItemData = (data: any) => {
    if (!data) return 'N/A'
    
    return (
      <div className="text-sm space-y-1">
        <div><strong>Part:</strong> {data.part_number}</div>
        <div><strong>Description:</strong> {data.part_description}</div>
        <div><strong>Qty:</strong> {data.quantity}</div>
        <div><strong>Location:</strong> {data.location}</div>
        <div><strong>Supplier:</strong> {data.supplier}</div>
      </div>
    )
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

  const pendingCount = pendingChanges.filter(change => change.status === 'pending').length

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pending Changes</h1>
          <p className="text-muted-foreground">
            {pendingCount} pending changes awaiting review
          </p>
        </div>
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <Button onClick={batchApprove} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve All ({pendingCount})
            </Button>
          )}
          <Button variant="outline" onClick={loadPendingChanges}>
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
          <CardTitle>All Changes</CardTitle>
          <CardDescription>
            Review and approve/deny inventory changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingChanges.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No pending changes found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingChanges.map((change) => (
                  <TableRow key={change.id}>
                    <TableCell>{getChangeTypeBadge(change.change_type)}</TableCell>
                    <TableCell className="font-mono">
                      {change.item_data?.part_number || change.original_data?.part_number || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {change.item_data?.part_description || change.original_data?.part_description || 'N/A'}
                    </TableCell>
                    <TableCell>{change.requested_by}</TableCell>
                    <TableCell>{new Date(change.request_date).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(change.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedChange(change)
                            setIsReviewModalOpen(true)
                          }}
                        >
                          <Eye className="w-3 w-3 mr-1" />
                          View
                        </Button>
                        {change.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => openReviewModal(change, 'approve')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openReviewModal(change, 'deny')}
                            >
                              <XCircle className="w-3 w-3 mr-1" />
                              Deny
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve' : 'Deny'} Change
            </DialogTitle>
            <DialogDescription>
              Review the change details and add notes
            </DialogDescription>
          </DialogHeader>

          {selectedChange && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Change Details</h4>
                  <div className="text-sm space-y-1">
                    <div><strong>Type:</strong> {getChangeTypeBadge(selectedChange.change_type)}</div>
                    <div><strong>Requested by:</strong> {selectedChange.requested_by}</div>
                    <div><strong>Date:</strong> {new Date(selectedChange.request_date).toLocaleString()}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Status</h4>
                  {getStatusBadge(selectedChange.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">New Data</h4>
                  <div className="bg-green-50 p-3 rounded border">
                    {formatItemData(selectedChange.item_data)}
                  </div>
                </div>
                {selectedChange.original_data && (
                  <div>
                    <h4 className="font-medium mb-2">Original Data</h4>
                    <div className="bg-red-50 p-3 rounded border">
                      {formatItemData(selectedChange.original_data)}
                    </div>
                  </div>
                )}
              </div>

              {selectedChange.status === 'pending' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Review Notes {reviewAction === 'deny' ? '(required)' : '(optional)'}
                  </label>
                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder={`Add notes about this ${reviewAction}...`}
                    rows={3}
                  />
                </div>
              )}

              {selectedChange.review_notes && (
                <div>
                  <h4 className="font-medium mb-2">Previous Review Notes</h4>
                  <div className="bg-gray-50 p-3 rounded border text-sm">
                    {selectedChange.review_notes}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Reviewed by {selectedChange.reviewed_by} on {selectedChange.review_date ? new Date(selectedChange.review_date).toLocaleString() : 'Unknown'}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewModalOpen(false)}>
              Cancel
            </Button>
            {selectedChange?.status === 'pending' && (
              <Button 
                onClick={submitReview}
                className={reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                variant={reviewAction === 'deny' ? 'destructive' : 'default'}
              >
                {reviewAction === 'approve' ? 'Approve' : 'Deny'} Change
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
