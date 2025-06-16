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
    const { items, webhookUrl } = body

    if (!items || !Array.isArray(items)) {
      console.error("❌ Invalid items data:", items)
      return NextResponse.json({ success: false, error: "Invalid items data" }, { status: 400 })
    }

    if (items.length === 0) {
      console.error("❌ No items provided")
      return NextResponse.json({ success: false, error: "No items to alert" }, { status: 400 })
    }

    // Use provided webhook URL or fallback to default
    const finalWebhookUrl =
      webhookUrl || "https://hooks.slack.com/services/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"

    console.log(`📊 Processing ${items.length} low stock items`)
    console.log(`🔗 Using webhook: ${finalWebhookUrl}`)

    // Create a simple, clean message
    let messageText = `🚨 Weekly Low Stock Alert 🚨\n\n`

    // Show first 3 items
    const itemsToShow = items.slice(0, 3)
    for (const item of itemsToShow) {
      messageText += `• ${item.partNumber} - ${item.description}\n`
      messageText += `  Current: ${item.currentStock} | Reorder at: ${item.reorderPoint}\n`
      messageText += `  Supplier: ${item.supplier} | Location: ${item.location}\n\n`
    }

    // Add summary if more items
    if (items.length > 3) {
      const remainingCount = items.length - 3
      messageText += `...and ${remainingCount} more items need attention\n\n`
    }

    messageText += `📋 Total: ${items.length} Low Stock Items\n`
    messageText += `📦 Next Steps: Create purchase requests for these items`

    // Simple payload - just text
    const payload = {
      text: messageText,
    }

    console.log("📤 Payload being sent:", {
      textLength: messageText.length,
      itemCount: items.length,
      payloadSize: JSON.stringify(payload).length,
    })

    // Add timeout and better error handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    let response
    try {
      response = await fetch(finalWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error("❌ Fetch error:", fetchError)

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return NextResponse.json(
          {
            success: false,
            error: "Request timeout - Slack webhook took too long to respond",
            troubleshooting: "Check your internet connection or try again",
          },
          { status: 408 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: `Network error: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`,
          troubleshooting: "Check your internet connection and webhook URL",
        },
        { status: 500 },
      )
    }

    clearTimeout(timeoutId)

    console.log("📡 Response status:", response.status)
    console.log("📡 Response headers:", Object.fromEntries(response.headers.entries()))

    let responseText = ""
    try {
      responseText = await response.text()
      console.log("📡 Response body:", responseText)
    } catch (textError) {
      console.error("❌ Error reading response text:", textError)
      responseText = "Could not read response"
    }

    if (!response.ok) {
      console.error("❌ Slack webhook failed with status:", response.status)

      let errorMessage = `Slack webhook failed: ${response.status} ${response.statusText}`
      let troubleshooting = ""

      switch (response.status) {
        case 404:
          if (responseText === "no_service") {
            errorMessage = "Webhook URL is invalid or expired"
            troubleshooting = "Create a new webhook URL in Slack API"
          } else {
            errorMessage = "Webhook endpoint not found"
            troubleshooting = "Verify the webhook URL is correct"
          }
          break
        case 400:
          errorMessage = "Invalid message format"
          troubleshooting = "Check the message payload format"
          break
        case 403:
          errorMessage = "Permission denied"
          troubleshooting = "Check if the app has permission to post to the channel"
          break
        case 500:
          errorMessage = "Slack server error"
          troubleshooting = "Try again in a few minutes"
          break
        default:
          troubleshooting = "Check Slack status and webhook configuration"
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          troubleshooting,
          details: responseText,
          status: response.status,
          webhookUsed: finalWebhookUrl.substring(0, 50) + "...",
        },
        { status: 500 },
      )
    }

    console.log("✅ Slack alert sent successfully")

    return NextResponse.json({
      success: true,
      itemCount: items.length,
      message: `Alert sent successfully for ${items.length} items`,
      response: responseText,
      webhookUsed: finalWebhookUrl.substring(0, 50) + "...",
    })
  } catch (error) {
    console.error("❌ Unexpected error in send-alert API:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        type: "unexpected_error",
        troubleshooting: "Check server logs for more details",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
