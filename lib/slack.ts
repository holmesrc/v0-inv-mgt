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

// Extremely simple Block Kit structure - minimal and guaranteed to work
export function createSimpleLowStockBlocks(items: any[]) {
  const displayItems = items.slice(0, 3)
  const remainingCount = items.length - displayItems.length

  // Create a simple text block with all the information
  let text = "*Weekly Low Stock Alert*\n\nThe following items are below their reorder points:\n\n"

  displayItems.forEach((item) => {
    text += `• *${item.partNumber}* - ${item.description}\n`
    text += `  Current: ${item.currentStock} | Reorder: ${item.reorderPoint}\n\n`
  })

  if (remainingCount > 0) {
    text += `_...and ${remainingCount} more items need attention_\n\n`
  }

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: text,
      },
    },
  ]

  // Add buttons in a separate actions block
  const elements = [
    {
      type: "button",
      text: {
        type: "plain_text",
        text: "Create Purchase Request",
      },
      url: "https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031",
    },
  ]

  if (remainingCount > 0) {
    elements.push({
      type: "button",
      text: {
        type: "plain_text",
        text: "Show All Items",
      },
      action_id: "show_all_low_stock",
      value: "show_all",
    })
  }

  blocks.push({
    type: "actions",
    elements: elements,
  })

  return blocks
}

// Simple full alert blocks
export function createSimpleFullLowStockBlocks(items: any[]) {
  // Limit to 20 items to avoid Slack limits
  const displayItems = items.slice(0, 20)

  let text = `*Complete Low Stock Report*\n\n*${items.length} items* are below their reorder points:\n\n`

  displayItems.forEach((item, index) => {
    text += `${index + 1}. *${item.partNumber}* - ${item.description}\n`
    text += `   Current: ${item.currentStock} | Reorder: ${item.reorderPoint}\n\n`
  })

  if (items.length > 20) {
    text += `_...and ${items.length - 20} more items (showing first 20)_\n\n`
  }

  text += "Click the button below to create purchase requests:"

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: text,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Create Purchase Request",
          },
          url: "https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031",
        },
      ],
    },
  ]

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

    return await postToSlack(text, blocks, channel)
  } catch (error) {
    console.error("Error sending interactive full alert, falling back to text:", error)
    // Fall back to text message
    const message = createFullLowStockMessage(items)
    return sendSlackMessage(message, channel)
  }
}
