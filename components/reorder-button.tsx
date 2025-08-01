"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ShoppingCart, ExternalLink, MessageSquare } from "lucide-react"

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

  // Generate pre-filled Slack workflow URL
  const generateWorkflowUrl = () => {
    const params = new URLSearchParams({
      part_number: partNumber,
      description: description,
      current_qty: currentQty.toString(),
      reorder_point: reorderPoint.toString(),
      supplier: supplier || 'TBD',
      location: location || 'Unknown',
      urgency: currentQty <= 0 ? 'High' : 'Medium',
      requested_by: 'Inventory System'
    })

    return `https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031?${params.toString()}`
  }

  // Send reorder request to Slack
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
        // Also open the workflow for manual completion if needed
        window.open(generateWorkflowUrl(), '_blank')
      } else {
        throw new Error(result.error || 'Failed to send reorder request')
      }
    } catch (error) {
      console.error('Reorder request failed:', error)
      alert('Failed to send reorder request. Opening workflow manually.')
      window.open(generateWorkflowUrl(), '_blank')
    }
    setLoading(false)
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
          onClick={() => window.open(generateWorkflowUrl(), '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          Open Workflow
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
        {loading ? 'Sending...' : 'Reorder'}
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => window.open(generateWorkflowUrl(), '_blank')}
      >
        <ExternalLink className="h-4 w-4 mr-1" />
        Workflow
      </Button>
    </div>
  )
}
