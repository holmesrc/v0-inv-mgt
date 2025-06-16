// Slack integration for inventory alerts
const SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/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"

export interface LowStockItem {
  partNumber: string
  description: string
  supplier: string
  location: string
  currentStock: number
  reorderPoint: number
}

export interface SlackResult {
  success: boolean
  error?: string
  configured?: boolean
  itemCount?: number
}

// Create a professional low stock alert matching your format
export async function sendLowStockAlert(items: LowStockItem[]): Promise<SlackResult> {
  const webhookUrl = "https://hooks.slack.com/services/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"

  if (!items || items.length === 0) {
    return { success: false, error: "No items to alert" }
  }

  try {
    // Create the message text
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

    const payload = {
      channel: "#inventory-alerts",
      username: "Part Order APP",
      icon_emoji: ":package:",
      text: messageText,
    }

    console.log("Sending Slack alert:", payload)

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Slack webhook error:", errorText)
      throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`)
    }

    const responseText = await response.text()
    console.log("Slack response:", responseText)

    return { success: true, itemCount: items.length }
  } catch (error) {
    console.error("Error sending Slack alert:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Test the Slack connection
export async function testSlackConnection(): Promise<SlackResult> {
  try {
    const testPayload = {
      channel: "#inventory-alerts",
      username: "Part Order APP",
      icon_emoji: ":white_check_mark:",
      text: "✅ Slack integration test successful! Your inventory alerts are working.",
    }

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    return { success: true }
  } catch (error) {
    console.error("Slack connection test failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
