// Use ONLY environment variables - no hardcoded webhooks
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL_NEW || process.env.SLACK_WEBHOOK_URL_BACKUP

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
export async function sendSlackMessage(message: string): Promise<SlackResult> {
  try {
    if (!SLACK_WEBHOOK_URL) {
      console.log("❌ No webhook URL found in environment variables")
      return {
        success: false,
        error: "Slack not configured - no webhook URL found",
      }
    }

    const payload = { text: message }

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${responseText}`,
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Test connection
export async function testSlackConnection(): Promise<SlackResult> {
  return await sendSlackMessage("✅ Slack integration test successful!")
}

// Create clean low stock alert message
export function createCleanLowStockAlertMessage(items: LowStockItem[]): string {
  const itemCount = items.length
  const itemText = itemCount === 1 ? "item" : "items"

  let message = `🚨 Low Stock Alert - ${itemCount} ${itemText} need attention:\n\n`

  items.forEach((item, index) => {
    message += `${index + 1}. ${item.partNumber} - ${item.description}\n`
    message += `   Location: ${item.location}\n`
    message += `   Current: ${item.currentStock} | Reorder at: ${item.reorderPoint}\n`
    message += `   Supplier: ${item.supplier}\n\n`
  })

  return message
}

// Create approval message
export function createApprovalMessage(changeId: string, changeData: any, appUrl: string): string {
  const { change_type, item_data } = changeData

  let actionText = ""
  let itemDetails = ""

  switch (change_type) {
    case "add":
      actionText = "➕ New Item Addition Request"
      itemDetails = `Part: ${item_data.part_number}\nDescription: ${item_data.part_description}\nQuantity: ${item_data.qty}`
      break
    case "update":
      actionText = "✏️ Item Update Request"
      itemDetails = `Part: ${item_data.part_number}\nDescription: ${item_data.part_description}`
      break
    case "delete":
      actionText = "🗑️ Item Deletion Request"
      itemDetails = `Part: ${item_data.part_number}\nDescription: ${item_data.part_description}`
      break
    default:
      actionText = "📝 Inventory Change Request"
      itemDetails = `Type: ${change_type}`
  }

  const approvalUrl = `${appUrl}/approval/${changeId}`
  return `${actionText}\n\n${itemDetails}\n\nRequested by: ${changeData.requested_by || "System"}\n\n🔗 Review: ${approvalUrl}`
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
    return {
      success: false,
      error: "Failed to send approval notification",
    }
  }
}

// Send low stock alert
export async function sendInteractiveLowStockAlert(items: LowStockItem[]): Promise<SlackResult> {
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
    return {
      success: false,
      error: "Failed to send low stock alert",
      itemCount: items?.length || 0,
    }
  }
}
