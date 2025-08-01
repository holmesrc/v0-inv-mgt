import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { partNumber, description, currentQty, reorderPoint, supplier, requestedBy } = await request.json()

    // Your Slack workflow webhook URL (you'll need to get this from your workflow settings)
    const workflowWebhookUrl = process.env.SLACK_WORKFLOW_WEBHOOK_URL

    if (!workflowWebhookUrl) {
      // Fallback to regular Slack message if workflow webhook isn't configured
      return await sendRegularSlackMessage(request)
    }

    // Prepare the data for your Slack workflow
    // The field names should match your workflow's input fields
    const workflowData = {
      part_number: partNumber,
      part_description: description,
      current_quantity: currentQty.toString(),
      reorder_point: reorderPoint.toString(),
      supplier: supplier || 'TBD',
      urgency: currentQty <= 0 ? 'High' : 'Medium',
      requested_by: requestedBy || 'Inventory System',
      timestamp: new Date().toISOString(),
      status: currentQty <= 0 ? 'Out of Stock' : 'Low Stock'
    }

    console.log('🔄 Triggering Slack workflow with data:', workflowData)

    // Trigger the Slack workflow directly
    const response = await fetch(workflowWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflowData)
    })

    if (!response.ok) {
      throw new Error(`Slack workflow trigger failed: ${response.status} - ${await response.text()}`)
    }

    console.log(`✅ Successfully triggered Slack workflow for part: ${partNumber}`)

    return NextResponse.json({
      success: true,
      message: `Workflow triggered for ${partNumber}`,
      partNumber,
      method: 'workflow_webhook'
    })

  } catch (error) {
    console.error('❌ Slack workflow trigger error:', error)
    
    // Fallback to regular Slack message
    try {
      return await sendRegularSlackMessage(request)
    } catch (fallbackError) {
      return NextResponse.json({
        error: 'Failed to trigger workflow and send fallback message',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  }
}

// Fallback function to send regular Slack message
async function sendRegularSlackMessage(request: NextRequest) {
  const { partNumber, description, currentQty, reorderPoint, supplier, requestedBy } = await request.json()
  
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    throw new Error('No Slack webhook URLs configured')
  }

  const message = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🔄 Reorder Request (Manual Workflow)",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Part:* ${partNumber}\n*Description:* ${description}\n*Current Qty:* ${currentQty}\n*Reorder Point:* ${reorderPoint}\n*Supplier:* ${supplier || 'TBD'}\n*Status:* ${currentQty <= 0 ? '🔴 Out of Stock' : '🟡 Low Stock'}`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "⚠️ *Manual Workflow Required*\nPlease search for 'Purchase Request' workflow in Slack and fill in the details above."
        }
      }
    ]
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  })

  return NextResponse.json({
    success: true,
    message: `Fallback message sent for ${partNumber}`,
    partNumber,
    method: 'fallback_message'
  })
}
