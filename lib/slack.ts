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

// Enhanced Block Kit message with individual reorder buttons for first 3 items
export function createLowStockAlertBlocks(items: any[]) {
  const displayItems = items.slice(0, 3)
  const remainingCount = items.length - displayItems.length

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🚨 Weekly Low Stock Alert",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "The following items are below their reorder points:",
      },
    },
    {
      type: "divider",
    },
  ]

  // Add each item with individual reorder button
  displayItems.forEach((item) => {
    // Truncate description to avoid Slack limits
    const description = item.description.length > 80 ? item.description.substring(0, 77) + "..." : item.description

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${item.partNumber}* - ${description}\nCurrent: ${item.currentStock} | Reorder at: ${item.reorderPoint}\nSupplier: ${item.supplier || "N/A"} | Location: ${item.location || "N/A"}`,
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "Reorder",
        },
        style: "primary",
        action_id: "reorder_item",
        url: "https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031",
      },
    })
  })

  // Add remaining count and show all button if needed
  if (remainingCount > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `_...and ${remainingCount} more items need attention_`,
      },
    })

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "📄 *View Complete Report:* Click below to see all low stock items.",
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "Show All Items",
        },
        style: "danger",
        action_id: "show_all_low_stock",
        value: "show_all",
      },
    })
  }

  blocks.push({
    type: "divider",
  })

  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: "📋 *Instructions:*\n• Click 'Reorder' buttons to open the Purchase Request shortcut\n• Send completed requests to #PHL10-hw-lab-requests\n• Reply with \"approve [part-number]\" for quick actions",
    },
  })

  return blocks
}

// Enhanced full alert with individual reorder buttons for ALL items
export function createFullLowStockBlocks(items: any[]) {
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🚨 Complete Low Stock Report",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${items.length} items* are below their reorder points:`,
      },
    },
    {
      type: "divider",
    },
  ]

  // Add ALL items with reorder buttons (limit to 45 to stay under Slack's 50 block limit)
  const displayItems = items.slice(0, 45)

  displayItems.forEach((item, index) => {
    // Truncate description to avoid Slack limits
    const description = item.description.length > 60 ? item.description.substring(0, 57) + "..." : item.description

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${index + 1}. *${item.partNumber}* - ${description}\nCurrent: ${item.currentStock} | Reorder: ${item.reorderPoint}\nSupplier: ${item.supplier || "N/A"} | Location: ${item.location || "N/A"}`,
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "Reorder",
        },
        style: "primary",
        action_id: "reorder_item",
        url: "https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031",
      },
    })
  })

  if (items.length > 45) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `_...and ${items.length - 45} more items (showing first 45 due to Slack limits)_`,
      },
    })
  }

  blocks.push({
    type: "divider",
  })

  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: "📋 *Action Required:*\nClick 'Reorder' buttons above to create purchase requests.\nSend completed requests to #PHL10-hw-lab-requests channel.",
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
      throw new Error("Failed to post to Slack")
    }

    return await response.json()
  } catch (error) {
    console.error("Error posting to Slack:", error)
    throw error
  }
}

// Update the sendInteractiveLowStockAlert function to use enhanced blocks
export async function sendInteractiveLowStockAlert(items: any[], channel = "#inventory-alerts") {
  try {
    const blocks = createLowStockAlertBlocks(items)
    const text = `🚨 Weekly Low Stock Alert: ${items.length} items below reorder point`

    return await postToSlack(text, blocks, channel)
  } catch (error) {
    console.error("Error sending interactive Slack message:", error)
    // Fall back to text message
    const message = createLowStockAlertMessage(items)
    return sendSlackMessage(message, channel)
  }
}

// Update the sendInteractiveFullLowStockAlert function to use enhanced blocks
export async function sendInteractiveFullLowStockAlert(items: any[], channel = "#inventory-alerts") {
  try {
    const blocks = createFullLowStockBlocks(items)
    const text = `🚨 Complete Low Stock Report: ${items.length} items below reorder point`

    return await postToSlack(text, blocks, channel)
  } catch (error) {
    console.error("Error sending interactive full alert:", error)
    // Fall back to text message
    const message = createFullLowStockMessage(items)
    return sendSlackMessage(message, channel)
  }
}
