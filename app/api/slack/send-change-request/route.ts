import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { partNumber, quantity, requester, message } = await request.json()

    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      throw new Error('SLACK_WEBHOOK_URL environment variable is not set')
    }

    // Send change request message to Slack
    const slackMessage = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "📝 Changes Requested",
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
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*📋 Change Request:*\n${message}`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Next Steps:*\n• Review the requested changes\n• Update your request accordingly\n• Resubmit the purchase request\n• Contact procurement team if you have questions`
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `📅 ${new Date().toLocaleString()} | 👤 To: ${requester} | 🏷️ ${partNumber}`
            }
          ]
        }
      ],
      attachments: [
        {
          color: "#ff9500",
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

    console.log(`✅ Change request sent for ${partNumber} to ${requester}`)

    return NextResponse.json({
      success: true,
      message: `Change request sent to ${requester}`,
      partNumber,
      requester
    })

  } catch (error) {
    console.error('❌ Change request error:', error)
    return NextResponse.json({
      error: 'Failed to send change request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
