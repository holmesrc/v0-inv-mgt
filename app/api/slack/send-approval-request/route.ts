import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { changeId, description, requestedBy, changeDetails } = await req.json()

    if (!changeId || !description || !requestedBy || !changeDetails) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!slackWebhookUrl) {
      console.error("SLACK_WEBHOOK_URL is not defined in environment variables.")
      return NextResponse.json({ error: "Slack webhook URL not configured" }, { status: 500 })
    }

    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Approval Request for Change: *${changeId}*`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Description:*\n${description}`,
          },
          {
            type: "mrkdwn",
            text: `*Requested By:*\n${requestedBy}`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Change Details:*\n${changeDetails}`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "✅ Approve",
            },
            style: "primary",
            action_id: "approve_change",
            value: JSON.stringify({
              changeId: changeId,
              action: "approve",
            }),
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "❌ Reject",
            },
            style: "danger",
            action_id: "reject_change",
            value: JSON.stringify({
              changeId: changeId,
              action: "reject",
            }),
          },
        ],
      },
    ]

    const payload = {
      blocks: blocks,
    }

    const response = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error(`Failed to send Slack message. Status: ${response.status}, Body: ${await response.text()}`)
      return NextResponse.json({ error: "Failed to send Slack message" }, { status: 500 })
    }

    return NextResponse.json({ message: "Slack message sent successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error processing request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
