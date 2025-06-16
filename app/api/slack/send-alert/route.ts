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
      console.error("❌ Invalid items data")
      return NextResponse.json({ success: false, error: "Invalid items data" }, { status: 400 })
    }

    if (items.length === 0) {
      console.error("❌ No items provided")
      return NextResponse.json({ success: false, error: "No items to alert" }, { status: 400 })
    }

    // SECURE: Only use environment variable - no fallbacks, no logging
    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      console.error("❌ SLACK_WEBHOOK_URL not configured")
      return NextResponse.json(
        {
          success: false,
          error: "Slack webhook not configured",
          troubleshooting: "Set SLACK_WEBHOOK_URL environment variable",
        },
        { status: 500 },
      )
    }

    console.log(`📊 Processing ${items.length} low stock items`)
    // NO URL LOGGING - this was exposing the webhook

    // Create formatted message
    let messageText = `🚨 Weekly Low Stock Alert 🚨\n\n`

    const itemsToShow = items.slice(0, 3)
    for (const item of itemsToShow) {
      messageText += `• ${item.partNumber} - ${item.description}\n`
      messageText += `  Current: ${item.currentStock} | Reorder at: ${item.reorderPoint}\n`
      messageText += `  Supplier: ${item.supplier} | Location: ${item.location}\n`
      messageText += `  🛒 Create Purchase Request\n\n`
    }

    if (items.length > 3) {
      const remainingCount = items.length - 3
      messageText += `...and ${remainingCount} more items need attention\n\n`
    }

    messageText += `📋 View All ${items.length} Low Stock Items\n\n`
    messageText += `📦 Next Steps:\n`
    messageText += `• Click the purchase request links above\n`
    messageText += `• Send completed requests to #PHL10-hw-lab-requests channel`

    const payload = { text: messageText }

    console.log("📤 Sending to Slack...")

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    console.log("📡 Slack response status:", response.status)
    // NO response body logging - could contain sensitive info

    if (!response.ok) {
      console.error("❌ Slack webhook failed")

      let errorMessage = `Slack webhook failed: ${response.status}`
      if (responseText === "no_service") {
        errorMessage = "Webhook URL is invalid or expired"
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          status: response.status,
          // NO webhook URL in response - this was exposing it
        },
        { status: 500 },
      )
    }

    console.log("✅ Slack alert sent successfully")
    return NextResponse.json({
      success: true,
      itemCount: items.length,
      message: `Alert sent successfully for ${items.length} items`,
      // NO webhook URL or response details - this was exposing sensitive info
    })
  } catch (error) {
    console.error("❌ Error in send-alert API:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        // NO error details - could expose sensitive info
      },
      { status: 500 },
    )
  }
}
