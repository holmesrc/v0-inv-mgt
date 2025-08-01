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

    // Create reorder request record
    const reorderResponse = await fetch(`${request.nextUrl.origin}/api/reorder-requests`, {
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
        location,
        quantity,
        timeframe,
        urgency,
        requester,
        notes
      })
    })

    const reorderResult = await reorderResponse.json()
    
    if (!reorderResult.success) {
      throw new Error('Failed to create reorder request record')
    }

    const requestId = reorderResult.requestId

    // Send to Slack
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

    // Create simplified Slack message without workflow buttons
    const message = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🛒 New Reorder Request Submitted",
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${urgencyInfo.emoji} ${urgencyInfo.priority} PRIORITY*\n*Request ID:* \`${requestId}\`\n*Requested by:* ${requester}\n*Timeframe:* ${timeframe}`
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
            text: `*📊 Request Summary:*\n• Request ID: \`${requestId}\`\n• Part: ${partNumber}\n• Quantity: ${quantity} units\n• Urgency: ${urgencyInfo.emoji} ${urgency}\n• Timeframe: ${timeframe}\n• Requester: ${requester}\n• Current Stock: ${currentQty}/${reorderPoint}`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*🎯 Next Steps:*\n• Review request details above\n• Update status via the Reorder Status page\n• Requester will be automatically notified of status changes`
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `📅 Submitted: ${new Date().toLocaleString()} | 🏷️ ${partNumber} | 📦 ${quantity} units | ${urgencyInfo.emoji} ${urgency} | 🆔 ${requestId}`
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

    console.log(`✅ Reorder request submitted: ${requestId} for ${partNumber}: ${quantity} units, ${urgency} priority`)

    return NextResponse.json({
      success: true,
      message: `Reorder request submitted successfully`,
      requestId,
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
    console.error('❌ Reorder request submission error:', error)
    return NextResponse.json({
      error: 'Failed to submit reorder request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
