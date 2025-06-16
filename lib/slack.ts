// Secure Slack integration - NO URL exposure
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

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
  itemCount?: number
}

// Core Slack message sending function
export async function sendSlackMessage(payload: any): Promise<SlackResult> {
  try {
    if (!SLACK_WEBHOOK_URL) {
      throw new Error("SLACK_WEBHOOK_URL environment variable is not set")
    }

    console.log("📤 Sending Slack message...")

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Slack message failed:", errorText)
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    console.log("✅ Slack message sent successfully")
    return { success: true }
  } catch (error) {
    console.error("❌ Slack message failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Test the Slack connection with a simple message
export async function testSlackConnection(): Promise<SlackResult> {
  try {
    if (!SLACK_WEBHOOK_URL) {
      throw new Error("SLACK_WEBHOOK_URL environment variable is not set")
    }

    const testPayload = {
      text: "✅ Slack integration test successful! Your inventory alerts are working.",
    }

    console.log("🧪 Testing Slack connection...")

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Slack test failed:", errorText)
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    console.log("✅ Slack test successful")
    return { success: true }
  } catch (error) {
    console.error("❌ Slack connection test failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Create clean low stock alert message
export function createCleanLowStockAlertMessage(items: LowStockItem[]): any {
  const itemCount = items.length
  const itemText = itemCount === 1 ? "item" : "items"

  let message = `🚨 *Low Stock Alert* - ${itemCount} ${itemText} need attention:\n\n`

  items.forEach((item, index) => {
    message += `${index + 1}. *${item.partNumber}* - ${item.description}\n`
    message += `   📍 Location: ${item.location}\n`
    message += `   📦 Current: ${item.currentStock} | Reorder at: ${item.reorderPoint}\n`
    message += `   🏢 Supplier: ${item.supplier}\n\n`
  })

  return {
    text: message,
    username: "Inventory Bot",
    icon_emoji: ":warning:",
  }
}

// Create approval message with secure links
export function createApprovalMessage(changeId: string, changeData: any, appUrl: string): any {
  const { type, data } = changeData

  let actionText = ""
  let itemDetails = ""

  switch (type) {
    case "add":
      actionText = "➕ *New Item Addition Request*"
      itemDetails = `Part: ${data.partNumber}\nDescription: ${data.description}\nQuantity: ${data.quantity}`
      break
    case "update":
      actionText = "✏️ *Item Update Request*"
      itemDetails = `Part: ${data.partNumber}\nChanges: ${JSON.stringify(data.changes, null, 2)}`
      break
    case "delete":
      actionText = "🗑️ *Item Deletion Request*"
      itemDetails = `Part: ${data.partNumber}\nDescription: ${data.description}`
      break
    default:
      actionText = "📝 *Inventory Change Request*"
      itemDetails = `Type: ${type}\nData: ${JSON.stringify(data, null, 2)}`
  }

  const approvalUrl = `${appUrl}/approval/${changeId}`

  const message = `${actionText}\n\n${itemDetails}\n\nRequested by: ${changeData.requester || "System"}\n\n🔗 Review and approve: ${approvalUrl}`

  return {
    text: message,
    username: "Inventory Approval Bot",
    icon_emoji: ":clipboard:",
  }
}

// Send approval notification
export async function sendApprovalNotification(
  changeId: string,
  changeData: any,
  appUrl: string,
): Promise<SlackResult> {
  try {
    const message = createApprovalMessage(changeId, changeData, appUrl)
    return await sendSlackMessage(message)
  } catch (error) {
    console.error("❌ Failed to send approval notification:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Send low stock alert
export async function sendLowStockAlert(items: LowStockItem[]): Promise<SlackResult> {
  try {
    if (!items || items.length === 0) {
      return { success: true, itemCount: 0 }
    }

    const message = createCleanLowStockAlertMessage(items)
    const result = await sendSlackMessage(message)

    return {
      ...result,
      itemCount: items.length,
    }
  } catch (error) {
    console.error("❌ Failed to send low stock alert:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      itemCount: items?.length || 0,
    }
  }
}
