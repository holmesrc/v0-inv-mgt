import { type NextRequest, NextResponse } from "next/server"

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

export async function POST(request: NextRequest) {
  try {
    if (!SLACK_WEBHOOK_URL) {
      console.log("⚠️ Slack webhook URL not configured, skipping notification")
      return NextResponse.json({ success: true, message: "Slack not configured" })
    }

    const body = await request.json()
    const { batchItems, requestedBy, changeId } = body

    console.log("📤 Sending batch Slack notification:", {
      itemCount: batchItems?.length,
      requestedBy,
      changeId,
    })

    // Validate required fields
    if (!batchItems || !Array.isArray(batchItems) || batchItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Batch items are required",
        },
        { status: 400 },
      )
    }

    if (!requestedBy) {
      return NextResponse.json(
        {
          success: false,
          error: "Requester name is required",
        },
        { status: 400 },
      )
    }

    // Create item summary (show first 5 items, then indicate if there are more)
    const maxItemsToShow = 5
    const itemsToShow = batchItems.slice(0, maxItemsToShow)
    const remainingCount = Math.max(0, batchItems.length - maxItemsToShow)

    const itemsList = itemsToShow
      .map((item, index) => {
        const partNum = item.part_number || "N/A"
        const description = item.part_description || "No description"
        const qty = item.qty || 0
        const supplier = item.supplier || "N/A"
        const location = item.location || "N/A"

        return `${index + 1}. *${partNum}* - ${description}\n   📦 Qty: ${qty} | 🏢 ${supplier} | 📍 ${location}`
      })
      .join("\n")

    const remainingText = remainingCount > 0 ? `\n_...and ${remainingCount} more items_` : ""

    // Calculate total quantity
    const totalQty = batchItems.reduce((sum, item) => sum + (item.qty || 0), 0)

    // Get unique suppliers
    const uniqueSuppliers = [...new Set(batchItems.map((item) => item.supplier).filter(Boolean))]
    const suppliersText = uniqueSuppliers.length > 0 ? uniqueSuppliers.join(", ") : "Various"

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://v0-inv-mgt.vercel.app"

    const slackMessage = {
      text: `🔔 New Batch Approval Request from ${requestedBy}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🔔 New Batch Approval Request",
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Requester:*\n${requestedBy}`,
            },
            {
              type: "mrkdwn",
              text: `*Items:*\n${batchItems.length} parts`,
            },
            {
              type: "mrkdwn",
              text: `*Total Quantity:*\n${totalQty.toLocaleString()}`,
            },
            {
              type: "mrkdwn",
              text: `*Suppliers:*\n${suppliersText}`,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*📦 Items in Batch:*\n${itemsList}${remainingText}`,
          },
        },
        {
          type: "divider",
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `⏰ *Action Required:* Please review and approve/reject this batch\n🆔 *Change ID:* \`${changeId}\``,
          },
          accessory: {
            type: "button",
            text: {
              type: "plain_text",
              text: "Review in App",
            },
            url: `${appUrl}/approvals`,
            action_id: "review_batch",
          },
        },
      ],
    }

    console.log("📨 Sending Slack message for batch:", {
      itemCount: batchItems.length,
      totalQty,
      suppliers: uniqueSuppliers.length,
    })

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(slackMessage),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Slack API error:", response.status, errorText)
      throw new Error(`Slack API error: ${response.status} ${errorText}`)
    }

    console.log("✅ Batch Slack notification sent successfully")

    return NextResponse.json({
      success: true,
      message: "Batch Slack notification sent successfully",
    })
  } catch (error) {
    console.error("❌ Error sending batch Slack notification:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
