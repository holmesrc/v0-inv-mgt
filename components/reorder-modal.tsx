"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, AlertTriangle } from "lucide-react"

interface ReorderModalProps {
  isOpen: boolean
  onClose: () => void
  partNumber: string
  description: string
  currentQty: number
  reorderPoint: number
  supplier?: string
  location?: string
}

export function ReorderModal({
  isOpen,
  onClose,
  partNumber,
  description,
  currentQty,
  reorderPoint,
  supplier,
  location
}: ReorderModalProps) {
  const [formData, setFormData] = useState({
    quantity: '',
    timeframe: '',
    urgency: currentQty <= 0 ? 'High' : 'Medium',
    requester: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/slack/submit-reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Part information (pre-filled)
          partNumber,
          description,
          currentQty,
          reorderPoint,
          supplier,
          location,
          // User input
          quantity: formData.quantity,
          timeframe: formData.timeframe,
          urgency: formData.urgency,
          requester: formData.requester,
          notes: formData.notes
        })
      })

      const result = await response.json()

      if (result.success) {
        alert('✅ Reorder request sent to Slack successfully!')
        onClose()
        // Reset form
        setFormData({
          quantity: '',
          timeframe: '',
          urgency: currentQty <= 0 ? 'High' : 'Medium',
          requester: '',
          notes: ''
        })
      } else {
        throw new Error(result.error || 'Failed to send reorder request')
      }
    } catch (error) {
      console.error('Reorder submission failed:', error)
      alert(`Failed to send reorder request: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    setLoading(false)
  }

  const suggestedQuantity = Math.max(reorderPoint * 2, reorderPoint + 10)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Reorder Request
          </DialogTitle>
          <DialogDescription>
            Complete the reorder details for this part. The part information is already filled in.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pre-filled Part Information */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Part Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Part Number:</span>
                <div className="font-mono bg-white px-2 py-1 rounded border">{partNumber}</div>
              </div>
              <div>
                <span className="font-medium">Current Stock:</span>
                <div className="flex items-center gap-2">
                  <Badge variant={currentQty <= 0 ? "destructive" : "secondary"}>
                    {currentQty}
                  </Badge>
                  {currentQty <= 0 && <AlertTriangle className="h-4 w-4 text-red-500" />}
                </div>
              </div>
              <div className="col-span-2">
                <span className="font-medium">Description:</span>
                <div className="bg-white px-2 py-1 rounded border text-sm">{description}</div>
              </div>
              <div>
                <span className="font-medium">Reorder Point:</span>
                <div className="bg-white px-2 py-1 rounded border">{reorderPoint}</div>
              </div>
              <div>
                <span className="font-medium">Supplier:</span>
                <div className="bg-white px-2 py-1 rounded border">{supplier || 'TBD'}</div>
              </div>
            </div>
          </div>

          {/* User Input Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="quantity">How many would you like to reorder? *</Label>
              <Input
                id="quantity"
                type="number"
                placeholder={`Suggested: ${suggestedQuantity}`}
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Suggested quantity: {suggestedQuantity} (based on reorder point)
              </p>
            </div>

            <div>
              <Label htmlFor="timeframe">How soon do you need this? *</Label>
              <Select 
                value={formData.timeframe} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, timeframe: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASAP">ASAP (Emergency)</SelectItem>
                  <SelectItem value="1-3 days">1-3 days</SelectItem>
                  <SelectItem value="1 week">Within 1 week</SelectItem>
                  <SelectItem value="2 weeks">Within 2 weeks</SelectItem>
                  <SelectItem value="1 month">Within 1 month</SelectItem>
                  <SelectItem value="Standard">Standard lead time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="urgency">What is the urgency? *</Label>
              <Select 
                value={formData.urgency} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, urgency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Critical">🔴 Critical - Production stopped</SelectItem>
                  <SelectItem value="High">🟠 High - Will impact operations soon</SelectItem>
                  <SelectItem value="Medium">🟡 Medium - Standard reorder</SelectItem>
                  <SelectItem value="Low">🟢 Low - Stock up when convenient</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="requester">Who is requesting this reorder? *</Label>
              <Input
                id="requester"
                placeholder="Your name or department"
                value={formData.requester}
                onChange={(e) => setFormData(prev => ({ ...prev, requester: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="notes">Additional notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special requirements, preferred supplier, etc."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reorder Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
