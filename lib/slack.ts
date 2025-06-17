export async function sendSlackMessage(message: string, channel = "#inventory-alerts") {
  try {
    const response = await fetch("/api/slack/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, channel }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }))

      // Handle specific Slack errors
      if (response.status === 404 || errorData.details?.includes("no_service")) {
        throw new Error(
          "Slack webhook URL is invalid or expired. Please check your SLACK_WEBHOOK_URL environment variable.",
        )
      }

      throw new Error(
        `Slack API error: ${response.status} - ${errorData.error || errorData.details || "Unknown error"}`,
      )
    }

    return await response.json()
  } catch (error) {
    console.error("Error sending Slack message:", error)
    throw error
  }
}

export async function sendFullLowStockAlert(items: any[], channel = "#inventory-alerts") {
  try {
    console.log("🚀 Sending text-only full low stock alert")
    const message = createTextOnlyFullLowStockAlert(items)
    return await sendSlackMessage(message, channel)
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

export function createLowStockAlertMessage(items: any[]) {
  const displayItems = items.slice(0, 3)
  const remainingCount = items.length - displayItems.length

  let message = `🚨 *Weekly Low Stock Alert* 🚨\n\n`

  // Add first 3 items
  displayItems.forEach((item) => {
    message += `• *${item.partNumber}* - ${item.description}\n`
    message += `  Current: ${item.currentStock} | Reorder at: ${item.reorderPoint}\n`
    message += `  Supplier: ${item.supplier || "N/A"} | Location: ${item.location || "N/A"}\n`
    message += `  🛒 <https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031|Create Purchase Request>\n\n`
  })

  // Add remaining count and instructions
  if (remainingCount > 0) {
    message += `_...and ${remainingCount} more items need attention_\n\n`
    // Use the correct deployment URL
    const deploymentUrl = "https://v0-inv-mgt.vercel.app"
    message += `📄 <${deploymentUrl}/low-stock|📋 View All ${items.length} Low Stock Items>\n\n`
  }

  message += `📋 *Next Steps:*\n`
  message += `• Click the purchase request links above\n`
  message += `• Send completed requests to #PHL10-hw-lab-requests channel\n`

  return message
}

export function createFullLowStockMessage(items: any[]) {
  let message = `🚨 *Complete Low Stock Report* 🚨\n\n`
  message += `*${items.length} items* are below their reorder points:\n\n`

  items.forEach((item, index) => {
    message += `${index + 1}. *${item.partNumber}* - ${item.description}\n`
    message += `   Current: ${item.currentStock} | Reorder: ${item.reorderPoint}\n`
    message += `   Supplier: ${item.supplier || "N/A"} | Location: ${item.location || "N/A"}\n`
    message += `   🛒 <https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031|Create Purchase Request>\n\n`
  })

  message += `📋 *Action Required:*\n`
  message += `Click the purchase request links above to create orders.\n`
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

export async function postToSlack(text: string, blocks?: any[], channel = "#inventory-alerts") {
  try {
    const response = await fetch("/api/slack/post-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, blocks, channel }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Slack API error:", errorData)
      throw new Error(`Failed to post to Slack: ${errorData.error || "Unknown error"}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error posting to Slack:", error)
    throw error
  }
}

// Simplified sendInteractiveLowStockAlert function with fallback
export async function sendInteractiveLowStockAlert(items: any[], channel = "#inventory-alerts") {
  try {
    console.log("🚀 Sending text-only low stock alert (no interactive components)")
    const message = createLowStockAlertMessage(items)
    return await sendSlackMessage(message, channel)
  } catch (error) {
    console.error("❌ Error sending Slack message:", error)
    throw error
  }
}

// Simplified sendInteractiveFullLowStockAlert function with fallback
export async function sendInteractiveFullLowStockAlert(items: any[], channel = "#inventory-alerts") {
  try {
    console.log("🚀 Attempting to send interactive full alert")
    // For full alerts, just use text to avoid complexity
    const message = createTextOnlyFullLowStockAlert(items)
    return await sendSlackMessage(message, channel)
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

// Test Slack connection with better error handling
export async function testSlackConnection() {
  try {
    const testMessage = "✅ Slack connection test successful!"
    await sendSlackMessage(testMessage)
    return { success: true, message: "Test message sent successfully" }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
