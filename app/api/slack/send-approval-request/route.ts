import { type NextRequest, NextResponse } from "next/server"

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

export async function POST(request: NextRequest) {
  try {
    if (!SLACK_WEBHOOK_URL) {
      return NextResponse.json({
        success: false,
        error: "Slack webhook URL not configured in environment variables",
        reason: "environment_not_configured",
      })
    }

    const body = await request.json()
    const { changeType, itemData, originalData, requestedBy, changeId } = body

    // Format the message based on change type
    let message = `🔄 *Inventory Change Request*\n\n`
    message += `*Type:* ${changeType.toUpperCase()}\n`
    message += `*Requested by:* ${requestedBy}\n`
    message += `*Change ID:* ${changeId}\n\n`

    if (changeType === "add") {
      message += `*Adding New Item:*\n`
      message += `• Part Number: ${itemData.part_number}\n`
      message += `• Description: ${itemData.part_description}\n`
      message += `• Quantity: ${itemData.qty}\n`
      message += `• Location: ${itemData.location}\n`
      message += `• Supplier: ${itemData.supplier}\n`
    } else if (changeType === "update") {
      message += `*Updating Item:* ${originalData.part_number}\n`
      if (originalData.qty !== itemData.qty) {
        message += `• Quantity: ${originalData.qty} → ${itemData.qty}\n`
      }
      if (originalData.reorder_point !== itemData.reorder_point) {
        message += `• Reorder Point: ${originalData.reorder_point} → ${itemData.reorder_point}\n`
      }
    } else if (changeType === "delete") {
      message += `*Deleting Item:*\n`
      message += `• Part Number: ${originalData.part_number}\n`
      message += `• Description: ${originalData.part_description}\n`
      message += `• Current Quantity: ${originalData.qty}\n`
    }

    // Construct the approval dashboard URL properly
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://v0-inv-mgt.vercel.app"
    const cleanAppUrl = appUrl.replace(/\/approvals$/, "") // Remove /approvals if it exists
    const approvalUrl = `${cleanAppUrl}/approvals`

    message += `\n📋 Please review this change in the approval dashboard: ${approvalUrl}`

    const slackPayload = {
      text: message,
      username: "Inventory Bot",
      icon_emoji: ":package:",
    }

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(slackPayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Slack API error:", response.status, errorText)

      return NextResponse.json({
        success: false,
        error: `Slack API error: ${response.status} - ${errorText}`,
        details: {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: "Approval request sent to Slack successfully",
    })
  } catch (error) {
    console.error("Error sending approval request to Slack:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}
