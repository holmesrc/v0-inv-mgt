import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { partNumber, description, currentQty, reorderPoint, supplier } = await request.json()

    // Slack Workflow Webhook URL - you'll need to get this from your workflow settings
    const workflowWebhookUrl = process.env.SLACK_WORKFLOW_WEBHOOK_URL

    if (!workflowWebhookUrl) {
      throw new Error('SLACK_WORKFLOW_WEBHOOK_URL environment variable is not set')
    }

    // Prepare the data for your Slack workflow
    const workflowData = {
      part_number: partNumber,
      part_description: description,
      current_quantity: currentQty,
      reorder_point: reorderPoint,
      supplier: supplier || 'TBD',
      requested_by: 'Inventory Management System',
      urgency: currentQty <= 0 ? 'High' : 'Medium',
      timestamp: new Date().toISOString()
    }

    // Trigger the Slack workflow
    const response = await fetch(workflowWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflowData)
    })

    if (!response.ok) {
      throw new Error(`Slack workflow trigger failed: ${response.status}`)
    }

    console.log(`✅ Triggered Slack workflow for part: ${partNumber}`)

    return NextResponse.json({
      success: true,
      message: `Reorder workflow triggered for ${partNumber}`,
      partNumber,
      workflowTriggered: true
    })

  } catch (error) {
    console.error('❌ Slack workflow trigger error:', error)
    return NextResponse.json({
      error: 'Failed to trigger Slack workflow',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
