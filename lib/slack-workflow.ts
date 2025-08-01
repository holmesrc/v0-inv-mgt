// Slack Workflow Integration Utilities

export interface ReorderItem {
  partNumber: string
  description: string
  currentQty: number
  reorderPoint: number
  supplier?: string
  location?: string
}

/**
 * Generate a Slack workflow URL with pre-filled parameters
 */
export function generateSlackWorkflowUrl(item: ReorderItem): string {
  const baseUrl = "https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031"
  
  // Create URL parameters for the workflow
  const params = new URLSearchParams({
    part_number: item.partNumber,
    description: item.description,
    current_qty: item.currentQty.toString(),
    reorder_point: item.reorderPoint.toString(),
    supplier: item.supplier || 'TBD',
    location: item.location || 'Unknown',
    urgency: item.currentQty <= 0 ? 'High' : 'Medium',
    requested_by: 'Inventory System',
    timestamp: new Date().toISOString()
  })

  return `${baseUrl}?${params.toString()}`
}

/**
 * Generate a deep link that opens Slack and pre-fills the workflow
 */
export function generateSlackDeepLink(item: ReorderItem): string {
  // Slack deep link format for workflows
  const workflowId = "Ft07D5F2JPPW"
  const callbackId = "61b58ca025323cfb63963bcc8321c031"
  
  const payload = {
    workflow_id: workflowId,
    callback_id: callbackId,
    inputs: {
      part_number: item.partNumber,
      part_description: item.description,
      current_quantity: item.currentQty,
      reorder_point: item.reorderPoint,
      supplier: item.supplier || 'TBD',
      urgency: item.currentQty <= 0 ? 'High' : 'Medium'
    }
  }

  // Encode the payload for the deep link
  const encodedPayload = encodeURIComponent(JSON.stringify(payload))
  
  return `slack://workflow/${workflowId}?payload=${encodedPayload}`
}

/**
 * Create a hybrid approach - try deep link first, fallback to web
 */
export function createReorderLink(item: ReorderItem): {
  deepLink: string
  webLink: string
  hybridHtml: string
} {
  const deepLink = generateSlackDeepLink(item)
  const webLink = generateSlackWorkflowUrl(item)
  
  // HTML that tries deep link first, then falls back to web
  const hybridHtml = `
    <a href="${deepLink}" 
       onclick="setTimeout(() => { window.open('${webLink}', '_blank'); }, 500);"
       class="reorder-button">
      🔄 Reorder ${item.partNumber}
    </a>
  `

  return {
    deepLink,
    webLink,
    hybridHtml
  }
}
