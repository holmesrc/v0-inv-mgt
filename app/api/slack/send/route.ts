import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('🔔 Slack API called with:', JSON.stringify(body, null, 2))
    
    let message: string
    let channel = "#inventory-alerts"
    
    // Handle different message formats
    if (body.message) {
      // Direct message format
      message = body.message
      channel = body.channel || channel
    } else if (body.type === "low_stock" && body.items) {
      // Low stock alert format
      const lowStockItems = body.items
      const labLabel = body.labName ? ` — ${body.labName}` : ""
      const labPrefix = body.labSlug ? `/${body.labSlug}` : ""
      message = `🚨 *Low Stock Alert${labLabel}* 🚨\n\n${lowStockItems.length} items are running low:\n\n`
      
      lowStockItems.slice(0, 10).forEach((item: any) => {
        message += `• *${item["Part number"]}* - ${item["Part description"]}\n`
        message += `  📍 Location: ${item.Location} | 📦 Qty: ${item.QTY} | ⚠️ Reorder at: ${item.reorderPoint || 10}\n\n`
      })
      
      if (lowStockItems.length > 10) {
        message += `...and ${lowStockItems.length - 10} more items need attention\n\n`
      }
      
      // Add clickable link to low stock page
      message += `📋 <${process.env.APP_URL || "https://v0-inv-mgt.vercel.app"}${labPrefix}/low-stock|View All ${lowStockItems.length} Low Stock Items>\n\n`
      message += `📋 *Next Steps:*\n• Review all low stock items\n• Create purchase requests\n• Reorder critical components`
    } else {
      console.log('❌ Invalid message format')
      return NextResponse.json(
        {
          success: false,
          error: "Invalid message format",
          details: "Expected either 'message' field or 'type' and 'items' fields",
        },
        { status: 400 },
      )
    }
    
    const { dryRun = false } = body

    // Check if this is a dry run (configuration test)
    if (dryRun) {
      // Just check if the webhook URL is configured without sending
      const webhookUrl = process.env.SLACK_WEBHOOK_URL
      console.log('🔔 Dry run - webhook configured:', !!webhookUrl)

      if (!webhookUrl) {
        return NextResponse.json(
          {
            success: false,
            error: "Webhook URL not configured",
            details: "SLACK_WEBHOOK_URL environment variable is not set",
          },
          { status: 400 },
        )
      }

      if (!webhookUrl.startsWith("https://hooks.slack.com/")) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid webhook URL",
            details: "SLACK_WEBHOOK_URL does not appear to be a valid Slack webhook URL",
          },
          { status: 400 },
        )
      }

      // Return success for dry run without actually sending
      return NextResponse.json({
        success: true,
        message: "Configuration verified (dry run)",
        dryRun: true,
      })
    }

    // Regular message sending logic
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    console.log('🔔 Webhook URL configured:', !!webhookUrl)
    console.log('🔔 Webhook URL format valid:', webhookUrl?.startsWith("https://hooks.slack.com/"))

    if (!webhookUrl) {
      console.log('❌ No webhook URL configured')
      return NextResponse.json(
        {
          success: false,
          error: "Webhook URL not configured",
          details: "SLACK_WEBHOOK_URL environment variable is not set",
        },
        { status: 400 },
      )
    }

    const payload = {
      text: message,
      channel: channel,
    }
    
    console.log('🔔 Sending payload to Slack:', JSON.stringify(payload, null, 2))

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    console.log('🔔 Slack response status:', response.status)
    console.log('🔔 Slack response ok:', response.ok)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Slack webhook error:', response.status, errorText)

      if (response.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: "Webhook not found",
            details: "The Slack webhook URL appears to be invalid or expired (404 error)",
          },
          { status: 404 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: "Slack webhook failed",
          details: `HTTP ${response.status}: ${errorText}`,
        },
        { status: response.status },
      )
    }

    console.log('✅ Slack message sent successfully')
    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
    })
  } catch (error) {
    console.error("❌ Error in Slack send API:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
