import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { partNumber, quantity, requester, message } = await request.json()

    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      throw new Error('SLACK_WEBHOOK_URL environment variable is not set')
    }

    // Send denial message to Slack
    const slackMessage = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "❌ Purchase Request Denied",
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*To:* ${requester}\n*Re:* Purchase request for ${partNumber}`
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
              text: `*Part Number:*\n${partNumber}`
            },
            {
              type: "mrkdwn",
              text: `*Quantity:*\n${quantity} units`
            },
            {
              type: "mrkdwn",
              text: `*Status:*\n❌ DENIED`
            },
            {
              type: "mrkdwn",
              text: `*Date:*\n${new Date().toLocaleDateString()}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*🚫 Denial Reason:*\n${message}`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Next Steps:*\n• Review the denial reason above\n• Address any issues mentioned\n• Contact procurement team if you need clarification\n• You may resubmit if circumstances change`
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `📅 ${new Date().toLocaleString()} | 👤 To: ${requester} | 🏷️ ${partNumber} | ❌ DENIED`
            }
          ]
        }
      ],
      attachments: [
        {
          color: "#dc3545",
          blocks: []
        }
      ]
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(slackMessage)
    })

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`)
    }

    console.log(`✅ Denial sent for ${partNumber} to ${requester}`)

    return NextResponse.json({
      success: true,
      message: `Denial sent to ${requester}`,
      partNumber,
      requester
    })

  } catch (error) {
    console.error('❌ Denial error:', error)
    return NextResponse.json({
      error: 'Failed to send denial',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
