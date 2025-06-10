import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { pendingChangeId } = await request.json()

    if (!pendingChangeId) {
      return NextResponse.json({ error: "Missing pendingChangeId" }, { status: 400 })
    }

    // Get the pending change details
    const supabase = createServerSupabaseClient()
    const { data: pendingChange, error } = await supabase
      .from("pending_changes")
      .select("*")
      .eq("id", pendingChangeId)
      .single()

    if (error || !pendingChange) {
      console.error("Error fetching pending change:", error)
      return NextResponse.json({ error: "Failed to fetch pending change" }, { status: 500 })
    }

    // Prepare the message
    const changeType = pendingChange.change_type === "add" ? "Add New Item" : "Update Item"
    const requester = pendingChange.requester || "Unknown"

    const message = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `🔔 Inventory Change Request: ${changeType}`,
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Part Number:*\n${pendingChange.part_number}`,
            },
            {
              type: "mrkdwn",
              text: `*Requested By:*\n${requester}`,
            },
          ],
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Description:*\n${pendingChange.description}`,
            },
            {
              type: "mrkdwn",
              text: `*Location:*\n${pendingChange.location}`,
            },
          ],
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Current Stock:*\n${pendingChange.current_stock}`,
            },
            {
              type: "mrkdwn",
              text: `*Min Stock:*\n${pendingChange.min_stock}`,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Notes:*\n${pendingChange.notes || "No notes provided"}`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Approve",
                emoji: true,
              },
              style: "primary",
              action_id: `approve_${pendingChange.id}`,
              value: `approve_${pendingChange.id}`,
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Reject",
                emoji: true,
              },
              style: "danger",
              action_id: `reject_${pendingChange.id}`,
              value: `reject_${pendingChange.id}`,
            },
          ],
        },
      ],
    }

    // Send the message to Slack
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!slackWebhookUrl) {
      return NextResponse.json({ error: "Slack webhook URL not configured" }, { status: 500 })
    }

    const slackResponse = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    })

    if (!slackResponse.ok) {
      const slackError = await slackResponse.text()
      console.error("Error sending to Slack:", slackError)
      return NextResponse.json({ error: "Failed to send Slack message" }, { status: 500 })
    }

    // Update the pending change to mark as notification sent
    await supabase.from("pending_changes").update({ notification_sent: true }).eq("id", pendingChangeId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending approval request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
