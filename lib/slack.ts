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
      throw new Error("Failed to send Slack message")
    }

    return await response.json()
  } catch (error) {
    console.error("Error sending Slack message:", error)
    throw error
  }
}

export async function sendFullLowStockAlert(items: any[], channel = "#inventory-alerts") {
  try {
    const response = await fetch("/api/slack/send-full-alert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items, channel }),
    })

    if (!response.ok) {
      throw new Error("Failed to send full alert")
    }

    return await response.json()
  } catch (error) {
    console.error("Error sending full alert:", error)
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
    message += `  Supplier: ${item.supplier || "N/A"} | Location: ${item.location || "N/A"}\n\n`
  })

  // Add remaining count and instructions
  if (remainingCount > 0) {
    message += `_...and ${remainingCount} more items need attention_\n\n`
  }

  message += `📋 *Next Steps:*\n`
  message += `1. Review the items above\n`
  message += `2. Use this shortcut to create purchase requests: https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031\n`
  message += `3. Send completed requests to #PHL10-hw-lab-requests channel.\n\n`

  if (remainingCount > 0) {
    message += `📄 *View All Items:* Click the "Show All Low Stock Items" button below to see the complete list.\n\n`
  }

  message += `💡 *Quick Actions:* Reply to this message with "approve [part-number]" to fast-track common items.`

  return message
}

export function createFullLowStockMessage(items: any[]) {
  let message = `🚨 *Complete Low Stock Report* 🚨\n\n`
  message += `*${items.length} items* are below their reorder points:\n\n`

  items.forEach((item, index) => {
    message += `${index + 1}. *${item.partNumber}* - ${item.description}\n`
    message += `   Current: ${item.currentStock} | Reorder: ${item.reorderPoint}\n`
    message += `   Supplier: ${item.supplier || "N/A"} | Location: ${item.location || "N/A"}\n\n`
  })

  message += `📋 *Action Required:*\n`
  message += `Use the Purchase Request shortcut for each item: https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031\n\n`
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

    // Add Show All button
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
          value: "show_all",
          style: "primary",
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

// Simplified sendInteractiveLowStockAlert function
export async function sendInteractiveLowStockAlert(items: any[], channel = "#inventory-alerts") {
  try {
    const blocks = createSimpleLowStockBlocks(items)
    const text = `Weekly Low Stock Alert: ${items.length} items below reorder point`

    console.log("Sending interactive low stock alert with blocks:", JSON.stringify(blocks, null, 2))
    return await postToSlack(text, blocks, channel)
  } catch (error) {
    console.error("Error sending interactive Slack message, falling back to text:", error)
    // Fall back to text message
    const message = createLowStockAlertMessage(items)
    return sendSlackMessage(message, channel)
  }
}

// Simplified sendInteractiveFullLowStockAlert function
export async function sendInteractiveFullLowStockAlert(items: any[], channel = "#inventory-alerts") {
  try {
    const blocks = createSimpleFullLowStockBlocks(items)
    const text = `Complete Low Stock Report: ${items.length} items below reorder point`

    console.log("Sending interactive full low stock alert with blocks:", JSON.stringify(blocks, null, 2))
    return await postToSlack(text, blocks, channel)
  } catch (error) {
    console.error("Error sending interactive full alert, falling back to text:", error)
    // Fall back to text message
    const message = createFullLowStockMessage(items)
    return sendSlackMessage(message, channel)
  }
}
