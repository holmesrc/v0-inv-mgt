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

    // Calculate total quantity
    const totalQty = batchItems.reduce((sum: number, item: any) => sum + (item.qty || 0), 0)

    // Get unique suppliers
    const uniqueSuppliers = [...new Set(batchItems.map((item: any) => item.supplier).filter(Boolean))]
    const suppliersText = uniqueSuppliers.length > 0 ? uniqueSuppliers.join(", ") : "Various"

    // Create item list (show all items for batch)
    const itemsList = batchItems
      .map((item: any, index: number) => {
        const partNum = item.part_number || "N/A"
        const description = item.part_description || "No description"
        const qty = item.qty || 0
        const supplier = item.supplier || "N/A"
        const location = item.location || "N/A"

        return `• ${partNum} - ${description}
Quantity: ${qty}
Location: ${location}
Supplier: ${supplier}`
      })
      .join("\n")

    // Get the base app URL (without any path)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://v0-inv-mgt.vercel.app"
    // Remove any trailing slashes and ensure we don't duplicate /approvals
    const baseUrl = appUrl.replace(/\/+$/, "") // Remove trailing slashes
    const approvalUrl = baseUrl.endsWith("/approvals") ? baseUrl : `${baseUrl}/approvals`

    // Create simple text message
    let message = `🔄 *Batch Inventory Change Request*

`
    message += `*Type:* BATCH ADD
`
    message += `*Requested by:* ${requestedBy}
`
    message += `*Change ID:* ${changeId}

`
    message += `*Adding ${batchItems.length} New Items:*
`
    message += `Total Quantity: ${totalQty.toLocaleString()}
`
    message += `Suppliers: ${suppliersText}

`
    message += `${itemsList}

`
    message += `📋 Please review this batch change in the approval dashboard:
`
    message += approvalUrl

    const slackPayload = {
      text: message,
      username: "Inventory Bot",
      icon_emoji: ":package:",
    }

    console.log("📨 Sending simple text Slack message for batch:", {
      itemCount: batchItems.length,
      totalQty,
      suppliers: uniqueSuppliers.length,
    })

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(slackPayload),
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
