// Function to send a message to Slack
export async function sendSlackMessage(message: string | { text: string; blocks?: any[] }) {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      console.warn("SLACK_WEBHOOK_URL is not configured - Slack notifications disabled")
      return { success: false, error: "Slack webhook URL is not configured", configured: false }
    }

    // Log the first few characters of the webhook URL for debugging
    console.log(`Using webhook URL: ${webhookUrl.substring(0, 10)}...`)

    // Prepare the payload based on the message type
    const payload = typeof message === "string" ? { text: message } : message

    console.log("Sending Slack message:", JSON.stringify(payload, null, 2).substring(0, 500) + "...")

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    console.log(`Slack API response (${response.status}):`, responseText || "Empty response")

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText} - ${responseText}`)
    }

    return { success: true, configured: true }
  } catch (error) {
    console.error("Error sending Slack message:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error", configured: true }
  }
}

export async function sendFullLowStockAlert(items: any[], channel = "#inventory-alerts") {
  try {
    console.log("🚀 Sending full low stock alert")
    const message = createFullLowStockMessage(items)
    return await sendSlackMessage(message)
  } catch (error) {
    console.error("❌ Error sending Slack message:", error)
    throw error
  }
}

export function formatLowStockAlert(items: any[], showAll = false) {
  const displayItems = showAll ? items : items.slice(0, 3)
  const remainingCount = items.length - displayItems.length

  const itemList = displayItems
    .map(
      (item) =>
        `• ${item.partNumber} - ${item.description}: ${item.currentStock} units (Reorder at: ${item.reorderPoint})`,
    )
    .join("\n")

  let message = `🚨 *Weekly Low Stock Alert* 🚨\n\nThe following items are below their reorder points:\n\n${itemList}`

  if (!showAll && remainingCount > 0) {
    message += `\n\n_...and ${remainingCount} more items_`
  }

  if (!showAll) {
    message += `\n\nPlease review and place orders as needed.`
  }

  return message
}

// Updated to match the exact format from the screenshot
export function createLowStockAlertMessage(items: any[]) {
  const displayItems = items.slice(0, 3)
  const remainingCount = items.length - displayItems.length

  let message = `🚨 *Weekly Low Stock Alert* 🚨\n\n`

  // Add first 3 items in the exact format from the screenshot
  displayItems.forEach((item) => {
    message += `• *${item.partNumber}* - ${item.description}\n`
    message += `  Current: ${item.currentStock} | Reorder at: ${item.reorderPoint}\n`
    message += `  Supplier: ${item.supplier || "N/A"} | Location: ${item.location || "N/A"}\n`
    message += `  🛒 <https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031|Create Purchase Request>\n\n`
  })

  // Add remaining count and "View All" link
  if (remainingCount > 0) {
    message += `_...and ${remainingCount} more items need attention_\n\n`
    const deploymentUrl = process.env.NEXT_PUBLIC_APP_URL || "https://v0-inv-mgt.vercel.app"
    message += `📄 📋 <${deploymentUrl}/low-stock|View All ${items.length} Low Stock Items>\n\n`
  }

  // Add Next Steps section exactly like the screenshot
  message += `📋 *Next Steps:*\n`
  message += `• Click the purchase request links above\n`
  message += `• Send completed requests to #PHL10-hw-lab-requests channel`

  return message
}

export function createFullLowStockMessage(items: any[]) {
  let message = `🚨 *Complete Low Stock Report* 🚨\n\n`
  message += `*${items.length} items* are below their reorder points:\n\n`

  items.forEach((item, index) => {
    message += `${index + 1}. *${item.partNumber}* - ${item.description}\n`
    message += `   Current: ${item.currentStock} | Reorder: ${item.reorderPoint}\n`
    message += `   Supplier: ${item.supplier || "N/A"} | Location: ${item.location || "N/A"}\n`
    message += `   🛒 <https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031|Reorder this item>\n\n`
  })

  message += `📋 *Action Required:*\n`
  message += `Click the purchase request links above to create purchase requests.\n`
  message += `Send completed requests to #PHL10-hw-lab-requests channel.`

  return message
}

export function formatPurchaseRequest(request: any) {
  const urgencyEmoji = {
    low: "🟢",
    medium: "🟡",
    high: "🔴",
  }

  return (
    `📋 *New Purchase Request* ${urgencyEmoji[request.urgency]}\n\n` +
    `Part: ${request.partNumber} - ${request.description}\n` +
    `Quantity: ${request.quantity}\n` +
    `Urgency: ${request.urgency.toUpperCase()}\n` +
    `Requested by: ${request.requestedBy}\n` +
    `Date: ${new Date(request.requestDate).toLocaleDateString()}\n\n` +
    `Use this shortcut to process: https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031`
  )
}

// Simple text-only version for when interactive components don't work
export function createSimpleTextAlert(items: any[]) {
  const displayItems = items.slice(0, 3)
  const remainingCount = items.length - displayItems.length

  let message = `🚨 *Weekly Low Stock Alert* 🚨\n\n`
  message += `The following items are below their reorder points:\n\n`

  displayItems.forEach((item, index) => {
    message += `${index + 1}. *${item.partNumber}* - ${item.description}\n`
    message += `   Current: ${item.currentStock} | Reorder: ${item.reorderPoint}\n`
    message += `   Supplier: ${item.supplier || "N/A"} | Location: ${item.location || "N/A"}\n`
    message += `   🛒 <https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031|Reorder this item>\n\n`
  })

  if (remainingCount > 0) {
    message += `_...and ${remainingCount} more items need attention_\n\n`
    message += `📄 *For complete list, reply with "show all" or use the dashboard.*\n\n`
  }

  message += `📋 *Instructions:*\n`
  message += `• Click the reorder links above to create purchase requests\n`
  message += `• Send completed requests to #PHL10-hw-lab-requests\n`
  message += `• Reply "show all" for the complete list`

  return message
}

// Updated to include individual reorder buttons for each item
export function createSimpleLowStockBlocks(items: any[]) {
  const displayItems = items.slice(0, 3)
  const remainingCount = items.length - displayItems.length
  const blocks = []

  // Header block
  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: "🚨 *Weekly Low Stock Alert* 🚨\n\nThe following items are below their reorder points:",
    },
  })

  // Add each item as a separate section with its own button
  displayItems.forEach((item) => {
    // Truncate description if too long
    const description = item.description.length > 60 ? item.description.substring(0, 57) + "..." : item.description

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `• *${item.partNumber}* - ${description}\n  Current: ${item.currentStock} | Reorder: ${item.reorderPoint}\n  Supplier: ${item.supplier || "N/A"} | Location: ${item.location || "N/A"}`,
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "Reorder",
        },
        url: "https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031",
      },
    })
  })

  // Add remaining count if needed
  if (remainingCount > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `_...and ${remainingCount} more items need attention_`,
      },
    })

    // Add Show All button - SIMPLIFIED to avoid JSON parsing issues
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Show All Items",
          },
          action_id: "show_all_low_stock",
          // IMPORTANT: Use a simple string, not JSON
          value: "show_all",
        },
      ],
    })
  }

  return blocks
}

// Updated to include individual reorder buttons for each item
export function createSimpleFullLowStockBlocks(items: any[]) {
  // Limit to 15 items to avoid Slack limits (each item = 1 block, plus header = 16 total)
  const displayItems = items.slice(0, 15)
  const blocks = []

  // Header block
  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `🚨 *Complete Low Stock Report* 🚨\n\n*${items.length} items* are below their reorder points:`,
    },
  })

  // Add each item as a separate section with its own button
  displayItems.forEach((item, index) => {
    // Truncate description if too long
    const description = item.description.length > 50 ? item.description.substring(0, 47) + "..." : item.description

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${index + 1}. *${item.partNumber}* - ${description}\n   Current: ${item.currentStock} | Reorder: ${item.reorderPoint}\n   Supplier: ${item.supplier || "N/A"} | Location: ${item.location || "N/A"}`,
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "Reorder",
        },
        url: "https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031",
      },
    })
  })

  // Add note if there are more items than we can display
  if (items.length > 15) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `_...and ${items.length - 15} more items (showing first 15 due to Slack limits)_`,
      },
    })
  }

  // Add instructions
  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: "📋 *Instructions:* Click the 'Reorder' buttons above to create purchase requests. Send completed requests to #PHL10-hw-lab-requests channel.",
    },
  })

  return blocks
}

export async function postToSlack(text: string, blocks?: any[]) {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      console.error("Slack webhook URL not configured")
      return { success: false, error: "Slack webhook URL not configured" }
    }

    console.log("Posting to Slack:", text.substring(0, 100) + "...")

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, blocks }),
    })

    const responseText = await response.text()
    console.log(`Slack API response (${response.status}):`, responseText || "Empty response")

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText} - ${responseText}`)
    }

    return { success: true }
  } catch (error) {
    console.error("Error posting to Slack:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Use the exact format from the screenshot
export async function sendInteractiveLowStockAlert(items: any[]) {
  try {
    console.log("🚀 Sending formatted low stock alert")
    const message = createLowStockAlertMessage(items)
    return await sendSlackMessage(message)
  } catch (error) {
    console.error("❌ Error sending Slack message:", error)
    throw error
  }
}

// Simplified sendInteractiveFullLowStockAlert function with fallback
export async function sendInteractiveFullLowStockAlert(items: any[]) {
  try {
    console.log("🚀 Attempting to send interactive full alert")
    // For full alerts, just use text to avoid complexity
    const message = createFullLowStockMessage(items)
    return await sendSlackMessage(message)
  } catch (error) {
    console.error("❌ Full alert failed:", error)
    throw error
  }
}

// Create a text-only version that works with webhooks
export function createTextOnlyLowStockAlert(items: any[]) {
  const displayItems = items.slice(0, 3)
  const remainingCount = items.length - displayItems.length

  let message = `🚨 *Weekly Low Stock Alert* 🚨\n\n`
  message += `The following items are below their reorder points:\n\n`

  displayItems.forEach((item, index) => {
    message += `${index + 1}. *${item.partNumber}* - ${item.description}\n`
    message += `   Current: ${item.currentStock} | Reorder: ${item.reorderPoint}\n`
    message += `   Supplier: ${item.supplier || "N/A"} | Location: ${item.location || "N/A"}\n`
    message += `   🛒 <https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031|Reorder this item>\n\n`
  })

  if (remainingCount > 0) {
    message += `_...and ${remainingCount} more items need attention_\n\n`
    message += `To see all low stock items, click here: <https://v0-inv-mgt.vercel.app/low-stock|View All Low Stock Items>\n\n`
  }

  message += `📋 *Instructions:*\n`
  message += `• Click the reorder links above to create purchase requests\n`
  message += `• Send completed requests to #PHL10-hw-lab-requests\n`

  return message
}

// Create a text-only version of the full alert
export function createTextOnlyFullLowStockAlert(items: any[]) {
  let message = `🚨 *Complete Low Stock Report* 🚨\n\n`
  message += `*${items.length} items* are below their reorder points:\n\n`

  items.forEach((item, index) => {
    message += `${index + 1}. *${item.partNumber}* - ${item.description}\n`
    message += `   Current: ${item.currentStock} | Reorder: ${item.reorderPoint}\n`
    message += `   Supplier: ${item.supplier || "N/A"} | Location: ${item.location || "N/A"}\n`
    message += `   🛒 <https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031|Reorder this item>\n\n`
  })

  message += `📋 *Action Required:*\n`
  message += `Click the purchase request links above to create purchase requests.\n`
  message += `Send completed requests to #PHL10-hw-lab-requests channel.`

  return message
}

// NEW: Simple approval notification function
export function createSimpleApprovalMessage(change: any) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://v0-inv-mgt.vercel.app"
  const changeType = change.change_type || "unknown"
  const partNumber = change.part_number || "unknown"
  const description = change.description || "No description"
  const requester = change.requested_by || "Unknown"

  // Format the message based on change type
  let actionText = "Unknown action"
  let emoji = "📝"

  if (changeType === "add") {
    actionText = "Add New Item"
    emoji = "➕"
  } else if (changeType === "delete") {
    actionText = "Delete Item"
    emoji = "🗑️"
  } else if (changeType === "update") {
    actionText = "Update Item"
    emoji = "✏️"
  }

  const approvalUrl = `${appUrl}/requests-approval`

  return {
    text: `${emoji} Inventory Change Request: ${actionText} for ${partNumber}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} Inventory Change Request`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Action:* ${actionText}\n*Part:* ${partNumber}\n*Description:* ${description}\n*Requested by:* ${requester}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🔗 *<${approvalUrl}|Review All Pending Changes>*`,
        },
      },
    ],
  }
}

// New function to send approval notifications
export async function sendApprovalNotification(change: any) {
  try {
    console.log("Sending simple approval notification for change:", change.id)
    const message = createSimpleApprovalMessage(change)
    const result = await sendSlackMessage(message)

    if (!result.configured) {
      console.warn("Slack not configured, skipping notification")
      return { success: true, skipped: true, reason: "Slack not configured" }
    }

    return result
  } catch (error) {
    console.error("Error sending approval notification:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Update the testSlackWebhook function to accept custom message and webhook URL
export async function testSlackWebhook(customMessage?: string, customWebhookUrl?: string) {
  try {
    const webhookUrl = customWebhookUrl || process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      return { success: false, error: "Slack webhook URL not configured" }
    }

    const testMessage = {
      text: customMessage || "🧪 Test message from Inventory Management System",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              customMessage ||
              "🧪 *Test Message*\n\nThis is a test message to verify the Slack webhook is working correctly.",
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Sent from: ${process.env.NEXT_PUBLIC_APP_URL || "Unknown URL"} at ${new Date().toISOString()}`,
            },
          ],
        },
      ],
    }

    console.log("Sending test message to Slack:", JSON.stringify(testMessage, null, 2))

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testMessage),
    })

    const responseText = await response.text()
    console.log(`Slack test response (${response.status}):`, responseText || "Empty response")

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText} - ${responseText}`)
    }

    return { success: true, message: "Test message sent successfully" }
  } catch (error) {
    console.error("Error testing Slack webhook:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Function to check if the Slack webhook is configured
export function isSlackConfigured() {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  return { configured: !!webhookUrl, webhookUrl: webhookUrl ? "***configured***" : "not set" }
}

// Export the missing functions that are being imported elsewhere
export function createApprovalBlocks(change: any) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://v0-inv-mgt.vercel.app"
  const approvalUrl = `${appUrl}/approval/${change.id}`

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${change.change_type.toUpperCase()}* request for *${change.part_number}*\n${change.description || "No description"}\nRequested by: ${change.requested_by || "Unknown"}`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Review Request",
          },
          url: approvalUrl,
          style: "primary",
        },
      ],
    },
  ]
}

export function createApprovalMessage(change: any) {
  return createSimpleApprovalMessage(change)
}
