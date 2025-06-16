import { type NextRequest, NextResponse } from "next/server"

interface LowStockItem {
  partNumber: string
  description: string
  supplier: string
  location: string
  currentStock: number
  reorderPoint: number
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Slack send-alert API called")

    const body = await request.json()
    const { items } = body

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: "Invalid items data" }, { status: 400 })
    }

    if (items.length === 0) {
      return NextResponse.json({ success: false, error: "No items to alert" }, { status: 400 })
    }

    console.log(`📊 Processing ${items.length} low stock items`)

    // Updated webhook URL
    const webhookUrl = "https://hooks.slack.com/services/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"

    // Create the message text - simplified format to avoid payload issues
    let messageText = "🚨 Weekly Low Stock Alert 🚨\n\n"

    // Show first 3 items in detail
    const itemsToShow = items.slice(0, 3)

    for (const item of itemsToShow) {
      messageText += `• ${item.partNumber} - ${item.description}\n`
      messageText += `  Current: ${item.currentStock} | Reorder at: ${item.reorderPoint}\n`
      messageText += `  Supplier: ${item.supplier} | Location: ${item.location}\n`
      messageText += `  🛒 Create Purchase Request\n\n`
    }

    // Add summary if there are more items
    if (items.length > 3) {
      const remainingCount = items.length - 3
      messageText += `...and ${remainingCount} more items need attention\n\n`
    }

    messageText += `📋 View All ${items.length} Low Stock Items\n\n`
    messageText += "📦 Next Steps:\n"
    messageText += "• Click the purchase request links above\n"
    messageText += "• Send completed requests to #PHL10-hw-lab-requests channel"

    // Simplified payload to avoid invalid_payload error
    const payload = {
      text: messageText,
    }

    console.log("📤 Sending to Slack:", {
      itemCount: items.length,
      messageLength: messageText.length,
    })

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    console.log("📡 Slack response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Slack webhook error:", errorText)

      return NextResponse.json(
        {
          success: false,
          error: `Slack webhook failed: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: 500 },
      )
    }

    const responseText = await response.text()
    console.log("✅ Slack response:", responseText)

    return NextResponse.json({
      success: true,
      itemCount: items.length,
      message: `Alert sent successfully for ${items.length} items`,
    })
  } catch (error) {
    console.error("❌ Error in send-alert API:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
