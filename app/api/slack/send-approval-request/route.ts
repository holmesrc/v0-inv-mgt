import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { changeType, itemData, originalData, requestedBy, changeId } = await request.json()

    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      throw new Error("Slack webhook URL not configured")
    }

    let message = ""
    let actionText = ""

    if (changeType === "add") {
      actionText = "Add New Item"
      message =
        `🔔 *Inventory Change Approval Required*\n\n` +
        `**Action:** ${actionText}\n` +
        `**Requested by:** ${requestedBy}\n\n` +
        `**New Item Details:**\n` +
        `• Part Number: ${itemData.part_number}\n` +
        `• Description: ${itemData.part_description}\n` +
        `• Quantity: ${itemData.qty}\n` +
        `• Supplier: ${itemData.supplier}\n` +
        `• Location: ${itemData.location}\n` +
        `• Package: ${itemData.package}`
    } else if (changeType === "delete") {
      actionText = "Delete Item"
      message =
        `🔔 *Inventory Change Approval Required*\n\n` +
        `**Action:** ${actionText}\n` +
        `**Requested by:** ${requestedBy}\n\n` +
        `**Item to Delete:**\n` +
        `• Part Number: ${originalData.part_number}\n` +
        `• Description: ${originalData.part_description}\n` +
        `• Current Quantity: ${originalData.qty}`
    } else if (changeType === "update") {
      actionText = "Update Item"
      message =
        `🔔 *Inventory Change Approval Required*\n\n` +
        `**Action:** ${actionText}\n` +
        `**Requested by:** ${requestedBy}\n\n` +
        `**Changes:**\n` +
        `• Part Number: ${originalData.part_number}\n`

      // Show what's changing
      if (itemData.qty !== originalData.qty) {
        message += `• Quantity: ${originalData.qty} → ${itemData.qty}\n`
      }
      if (itemData.reorder_point !== originalData.reorder_point) {
        message += `• Reorder Point: ${originalData.reorder_point} → ${itemData.reorder_point}\n`
      }
    }

    // Add approval buttons
    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message,
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
            value: JSON.stringify({ changeId, action: "approve" }),
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "❌ Reject",
            },
            style: "danger",
            action_id: "reject_change",
            value: JSON.stringify({ changeId, action: "reject" }),
          },
        ],
      },
    ]

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: `Inventory Change Approval Required: ${actionText}`,
        blocks,
      }),
    })

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending approval request:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
