import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { partNumber, description, currentQty, reorderPoint, supplier, requestedBy } = await request.json()

    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      throw new Error('SLACK_WEBHOOK_URL environment variable is not set')
    }

    // Create a rich Slack message for reordering with workflow link
    const message = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🔄 Reorder Request",
            emoji: true
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Part Number:*\n${partNumber}`
            },
            {
              type: "mrkdwn",
              text: `*Description:*\n${description}`
            },
            {
              type: "mrkdwn",
              text: `*Current Qty:*\n${currentQty}`
            },
            {
              type: "mrkdwn",
              text: `*Reorder Point:*\n${reorderPoint}`
            },
            {
              type: "mrkdwn",
              text: `*Supplier:*\n${supplier || 'TBD'}`
            },
            {
              type: "mrkdwn",
              text: `*Requested By:*\n${requestedBy || 'System'}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Status:* ${currentQty <= 0 ? '🔴 Out of Stock' : '🟡 Low Stock'}\n*Urgency:* ${currentQty <= 0 ? 'HIGH' : 'MEDIUM'}`
          }
        },
        {
          type: "divider"
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "📋 *To complete this reorder:*\n• Click the workflow link below\n• The form will be pre-filled with part details\n• Review and submit the purchase request"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `🔗 *Workflow Link:* https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031\n\n_Note: This link only works within Slack. If it doesn't work, search for "Purchase Request" in Slack workflows._`
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Mark as Ordered",
                emoji: true
              },
              style: "primary",
              value: `ordered_${partNumber}`
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Skip for Now",
                emoji: true
              },
              value: `skip_${partNumber}`
            }
          ]
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `📅 Requested: ${new Date().toLocaleString()} | 🏷️ Part: ${partNumber} | 📊 Stock: ${currentQty}/${reorderPoint}`
            }
          ]
        }
      ]
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    })

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`)
    }

    console.log(`✅ Sent reorder request for part: ${partNumber}`)

    return NextResponse.json({
      success: true,
      message: `Reorder request sent for ${partNumber}`,
      partNumber,
      instructions: "Check Slack for the reorder message with workflow link"
    })

  } catch (error) {
    console.error('❌ Reorder request error:', error)
    return NextResponse.json({
      error: 'Failed to send reorder request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
