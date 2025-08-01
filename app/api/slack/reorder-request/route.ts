import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { partNumber, description, currentQty, reorderPoint, supplier, requestedBy } = await request.json()

    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      throw new Error('SLACK_WEBHOOK_URL environment variable is not set')
    }

    // Create a comprehensive Slack message with all data formatted for easy copying
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
          text: {
            type: "mrkdwn",
            text: `*Part Number:* \`${partNumber}\`\n*Description:* ${description}\n*Current Stock:* ${currentQty}\n*Reorder Point:* ${reorderPoint}\n*Supplier:* ${supplier || 'TBD'}\n*Urgency:* ${currentQty <= 0 ? '🔴 HIGH - Out of Stock' : '🟡 MEDIUM - Low Stock'}\n*Requested By:* ${requestedBy || 'System'}`
          }
        },
        {
          type: "divider"
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "📋 *Copy this data for your workflow:*"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `\`\`\`Part Number: ${partNumber}
Description: ${description}
Current Quantity: ${currentQty}
Reorder Point: ${reorderPoint}
Supplier: ${supplier || 'TBD'}
Urgency: ${currentQty <= 0 ? 'High' : 'Medium'}
Status: ${currentQty <= 0 ? 'Out of Stock' : 'Low Stock'}
Requested By: ${requestedBy || 'System'}
Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}\`\`\``
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "🔗 *To complete this reorder:*\n1. Search for `Purchase Request` in Slack workflows\n2. Copy the data above into the workflow form\n3. Submit the purchase request\n\n_Or use the workflow link: https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031_"
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "✅ Mark as Ordered",
                emoji: true
              },
              style: "primary",
              value: `ordered_${partNumber}`,
              action_id: "mark_ordered"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "⏭️ Skip for Now",
                emoji: true
              },
              value: `skip_${partNumber}`,
              action_id: "skip_reorder"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "🔄 Open Workflow",
                emoji: true
              },
              url: "https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031",
              action_id: "open_workflow"
            }
          ]
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `📅 ${new Date().toLocaleString()} | 🏷️ ${partNumber} | 📊 Stock: ${currentQty}/${reorderPoint} | 🚨 ${currentQty <= 0 ? 'URGENT' : 'Standard'}`
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
      instructions: "Check Slack for the reorder message with formatted data to copy into workflow"
    })

  } catch (error) {
    console.error('❌ Reorder request error:', error)
    return NextResponse.json({
      error: 'Failed to send reorder request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
