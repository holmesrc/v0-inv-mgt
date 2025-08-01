"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ShoppingCart, MessageSquare, Copy, ExternalLink } from "lucide-react"

interface ReorderButtonProps {
  partNumber: string
  description: string
  currentQty: number
  reorderPoint: number
  supplier?: string
  location?: string
}

export function ReorderButton({ 
  partNumber, 
  description, 
  currentQty, 
  reorderPoint, 
  supplier,
  location 
}: ReorderButtonProps) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  // Send reorder request to Slack with workflow instructions
  const sendReorderRequest = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/slack/reorder-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          partNumber,
          description,
          currentQty,
          reorderPoint,
          supplier,
          requestedBy: 'Web Interface'
        })
      })

      const result = await response.json()

      if (result.success) {
        setSent(true)
      } else {
        throw new Error(result.error || 'Failed to send reorder request')
      }
    } catch (error) {
      console.error('Reorder request failed:', error)
      alert(`Failed to send reorder request: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    setLoading(false)
  }

  // Copy workflow instructions to clipboard
  const copyWorkflowInstructions = async () => {
    const instructions = `🔄 REORDER REQUEST: ${partNumber}

Part Details:
• Part Number: ${partNumber}
• Description: ${description}
• Current Qty: ${currentQty}
• Reorder Point: ${reorderPoint}
• Supplier: ${supplier || 'TBD'}
• Location: ${location || 'Unknown'}
• Urgency: ${currentQty <= 0 ? 'HIGH - Out of Stock' : 'MEDIUM - Low Stock'}

To complete this reorder:
1. Copy this message
2. Go to Slack and paste it in #inventory-alerts
3. Use the workflow link that appears in the Slack message
4. Or search for "Purchase Request" workflow in Slack

Workflow ID: Ft07D5F2JPPW`

    try {
      await navigator.clipboard.writeText(instructions)
      alert('📋 Reorder instructions copied to clipboard!\n\nPaste this in Slack to complete the reorder process.')
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = instructions
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('📋 Reorder instructions copied to clipboard!\n\nPaste this in Slack to complete the reorder process.')
    }
  }

  if (sent) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled>
          <MessageSquare className="h-4 w-4 mr-1" />
          Sent to Slack
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={copyWorkflowInstructions}
        >
          <Copy className="h-4 w-4 mr-1" />
          Copy Details
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Button 
        onClick={sendReorderRequest}
        disabled={loading}
        size="sm"
        className="bg-blue-600 hover:bg-blue-700"
      >
        <ShoppingCart className="h-4 w-4 mr-1" />
        {loading ? 'Sending...' : 'Send to Slack'}
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={copyWorkflowInstructions}
      >
        <Copy className="h-4 w-4 mr-1" />
        Copy Info
      </Button>
    </div>
  )
}
