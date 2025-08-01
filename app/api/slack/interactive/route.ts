import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Parse the Slack interactive payload
    const formData = await request.formData()
    const payload = JSON.parse(formData.get('payload') as string)

    console.log('🔄 Slack interactive payload received:', payload)

    const { type, user, actions, response_url, message } = payload

    if (type !== 'block_actions') {
      return NextResponse.json({ error: 'Unsupported interaction type' }, { status: 400 })
    }

    const action = actions[0]
    const actionId = action.action_id
    const actionValue = action.value

    console.log(`📋 Action: ${actionId}, Value: ${actionValue}, User: ${user.name}`)

    // Parse the action value to get part info
    const [actionType, partNumber, quantity] = actionValue.split('_')

    let responseMessage = ''
    let messageColor = '#36a64f' // Default green

    switch (actionId) {
      case 'approve_order':
        responseMessage = `✅ *Order Approved by ${user.name}*\n\n*Part:* ${partNumber}\n*Quantity:* ${quantity} units\n*Status:* Approved for purchase\n*Next Steps:* Procurement team will process this order`
        messageColor = '#36a64f' // Green
        break

      case 'request_changes':
        responseMessage = `📝 *Changes Requested by ${user.name}*\n\n*Part:* ${partNumber}\n*Quantity:* ${quantity} units\n*Status:* Requires modification\n*Action Required:* Please review and resubmit with requested changes`
        messageColor = '#ff9500' // Orange
        break

      case 'deny_order':
        responseMessage = `❌ *Order Denied by ${user.name}*\n\n*Part:* ${partNumber}\n*Quantity:* ${quantity} units\n*Status:* Request denied\n*Reason:* Order does not meet approval criteria`
        messageColor = '#ff0000' // Red
        break

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    // Update the original message with the decision
    const updatedMessage = {
      replace_original: true,
      blocks: [
        ...message.blocks.slice(0, -2), // Keep all blocks except the last two (actions and context)
        {
          type: "divider"
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: responseMessage
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `📅 Decision made: ${new Date().toLocaleString()} | 👤 By: ${user.name} | 🏷️ ${partNumber}`
            }
          ]
        }
      ],
      attachments: [
        {
          color: messageColor,
          blocks: []
        }
      ]
    }

    // Send the updated message back to Slack
    const slackResponse = await fetch(response_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedMessage)
    })

    if (!slackResponse.ok) {
      throw new Error(`Failed to update Slack message: ${slackResponse.status}`)
    }

    // Also send a follow-up message to the channel for visibility
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (webhookUrl) {
      const followUpMessage = {
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `🔔 *Purchase Request Update*\n${responseMessage}`
            }
          }
        ]
      }

      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(followUpMessage)
      })
    }

    console.log(`✅ Successfully processed ${actionId} for ${partNumber}`)

    return NextResponse.json({ 
      success: true,
      action: actionId,
      partNumber,
      user: user.name
    })

  } catch (error) {
    console.error('❌ Slack interactive handler error:', error)
    return NextResponse.json({
      error: 'Failed to process interaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
