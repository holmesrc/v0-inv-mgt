import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const {
      // Part information (pre-filled)
      partNumber,
      description,
      currentQty,
      reorderPoint,
      supplier,
      location,
      // User input
      quantity,
      timeframe,
      urgency,
      requester,
      notes
    } = await request.json()

    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      throw new Error('SLACK_WEBHOOK_URL environment variable is not set')
    }

    // Determine urgency color and emoji
    const urgencyConfig = {
      'Critical': { color: '#FF0000', emoji: '🔴', priority: 'CRITICAL' },
      'High': { color: '#FF8C00', emoji: '🟠', priority: 'HIGH' },
      'Medium': { color: '#FFD700', emoji: '🟡', priority: 'MEDIUM' },
      'Low': { color: '#32CD32', emoji: '🟢', priority: 'LOW' }
    }

    const urgencyInfo = urgencyConfig[urgency as keyof typeof urgencyConfig] || urgencyConfig.Medium

    // Create comprehensive Slack message with all information
    const message = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🛒 Purchase Request Submitted",
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${urgencyInfo.emoji} ${urgencyInfo.priority} PRIORITY*\n*Requested by:* ${requester}\n*Timeframe:* ${timeframe}`
          }
        },
        {
          type: "divider"
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Part Number:*\n\`${partNumber}\``
            },
            {
              type: "mrkdwn",
              text: `*Quantity Requested:*\n*${quantity} units*`
            },
            {
              type: "mrkdwn",
              text: `*Current Stock:*\n${currentQty} (Reorder at ${reorderPoint})`
            },
            {
              type: "mrkdwn",
              text: `*Supplier:*\n${supplier || 'TBD'}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Description:* ${description}`
          }
        },
        ...(location ? [{
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Location:* ${location}`
          }
        }] : []),
        ...(notes ? [{
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Additional Notes:*\n${notes}`
          }
        }] : []),
        {
          type: "divider"
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*📊 Order Summary:*\n• Part: ${partNumber}\n• Quantity: ${quantity} units\n• Urgency: ${urgencyInfo.emoji} ${urgency}\n• Timeframe: ${timeframe}\n• Requester: ${requester}\n• Current Stock: ${currentQty}/${reorderPoint}`
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "✅ Approve Order",
                emoji: true
              },
              style: "primary",
              value: `approve_${partNumber}_${quantity}`,
              action_id: "approve_order"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "📝 Request Changes",
                emoji: true
              },
              value: `modify_${partNumber}_${quantity}`,
              action_id: "request_changes"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "❌ Deny Order",
                emoji: true
              },
              style: "danger",
              value: `deny_${partNumber}_${quantity}`,
              action_id: "deny_order"
            }
          ]
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `📅 Submitted: ${new Date().toLocaleString()} | 🏷️ ${partNumber} | 📦 ${quantity} units | ${urgencyInfo.emoji} ${urgency}`
            }
          ]
        }
      ],
      // Add color bar based on urgency
      attachments: [
        {
          color: urgencyInfo.color,
          blocks: []
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

    console.log(`✅ Purchase request submitted for ${partNumber}: ${quantity} units, ${urgency} priority`)

    return NextResponse.json({
      success: true,
      message: `Purchase request submitted successfully`,
      orderDetails: {
        partNumber,
        quantity,
        urgency,
        timeframe,
        requester,
        submittedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Purchase request submission error:', error)
    return NextResponse.json({
      error: 'Failed to submit purchase request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
