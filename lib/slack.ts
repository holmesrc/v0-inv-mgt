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

  let message = `🚨 *Weekly Low Stock Alert* 🚨\n\nThe following items are below their reorder points:\n\n`

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
  message += `3. Send completed requests to #PHL10-hw-lab-requests\n\n`

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
