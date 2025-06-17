// TEMPORARY: Use the correct working webhook URL to bypass Vercel caching issues
// TODO: Remove this once environment variables work properly
const WORKING_WEBHOOK_URL = "https://hooks.slack.com/services/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"

// Use hardcoded URL as fallback if env vars are still cached
const SLACK_WEBHOOK_URL =
  process.env.SLACK_WEBHOOK_URL_NEW || process.env.SLACK_WEBHOOK_URL_BACKUP || WORKING_WEBHOOK_URL

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

// Core Slack message sending function with debugging
export async function sendSlackMessage(message: string): Promise<SlackResult> {
  try {
    if (!SLACK_WEBHOOK_URL) {
      console.log("❌ No webhook URL found")
      return {
        success: false,
        error: "Slack not configured - no webhook URL found",
      }
    }

    console.log("🔍 Using webhook URL exists:", !!SLACK_WEBHOOK_URL)
    console.log("🔍 Webhook URL length:", SLACK_WEBHOOK_URL.length)
    console.log("🔍 Webhook URL ends with:", SLACK_WEBHOOK_URL.slice(-10))
    console.log("🔍 Message length:", message.length)
    console.log("🔍 Message preview:", message.substring(0, 100) + "...")

    const payload = { text: message }
    console.log("🔍 Payload:", JSON.stringify(payload, null, 2))

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    console.log("🔍 Response status:", response.status)
    console.log("🔍 Response headers:", Object.fromEntries(response.headers.entries()))

    const responseText = await response.text()
    console.log("🔍 Response body:", responseText)

    if (!response.ok) {
      console.error("❌ Slack request failed")
      return {
        success: false,
        error: `HTTP ${response.status}: ${responseText}`,
      }
    }

    console.log("✅ Slack message sent successfully")
    return { success: true }
  } catch (error) {
    console.error("❌ Slack error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Test connection with detailed logging
export async function testSlackConnection(): Promise<SlackResult> {
  console.log("🧪 Testing Slack connection...")
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
