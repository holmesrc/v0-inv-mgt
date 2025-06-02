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

export function createLowStockAlertBlocks(items: any[]) {
  const displayItems = items.slice(0, 3)
  const remainingCount = items.length - displayItems.length

  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🚨 Weekly Low Stock Alert 🚨",
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

  // Add each item with a reorder button
  displayItems.forEach((item) => {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${item.partNumber}* - ${item.description}\nCurrent: ${item.currentStock} | Reorder at: ${item.reorderPoint}\nSupplier: ${item.supplier || "N/A"} | Location: ${item.location || "N/A"}`,
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "Reorder",
        },
        style: "primary",
        action_id: "reorder_item",
        value: JSON.stringify(item),
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
        text: "📄 *View All Items:* Click the button below to see the complete list.",
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "Show All Low Stock Items",
        },
        style: "danger",
        action_id: "show_all_low_stock",
        value: JSON.stringify(items),
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
      text: "📋 *Next Steps:*\n1. Review the items above\n2. Click 'Reorder' buttons to create purchase requests\n3. Send completed requests to #PHL10-hw-lab-requests\n\n💡 *Quick Actions:* Reply to this message with \"approve [part-number]\" to fast-track common items.",
    },
  })

  return blocks
}

export function createFullLowStockBlocks(items: any[]) {
  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🚨 Complete Low Stock Report 🚨",
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

  // Add each item with a reorder button
  items.forEach((item, index) => {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${index + 1}. *${item.partNumber}* - ${item.description}\nCurrent: ${item.currentStock} | Reorder: ${item.reorderPoint}\nSupplier: ${item.supplier || "N/A"} | Location: ${item.location || "N/A"}`,
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "Reorder",
        },
        style: "primary",
        action_id: "reorder_item",
        value: JSON.stringify(item),
        url: "https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031",
      },
    })
  })

  blocks.push({
    type: "divider",
  })

  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: "📋 *Action Required:*\nClick the 'Reorder' buttons above to create purchase requests using the Purchase Request shortcut.\n\nSend completed requests to #PHL10-hw-lab-requests channel.",
    },
  })

  return blocks
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

export async function sendInteractiveLowStockAlert(items: any[], channel = "#inventory-alerts") {
  try {
    const blocks = createLowStockAlertBlocks(items)

    const response = await fetch("/api/slack/send-interactive-blocks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ blocks, channel }),
    })

    if (!response.ok) {
      throw new Error("Failed to send interactive Slack message")
    }

    return await response.json()
  } catch (error) {
    console.error("Error sending interactive Slack message:", error)
    throw error
  }
}

export async function sendInteractiveFullLowStockAlert(items: any[], channel = "#inventory-alerts") {
  try {
    const blocks = createFullLowStockBlocks(items)

    const response = await fetch("/api/slack/send-interactive-blocks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ blocks, channel }),
    })

    if (!response.ok) {
      throw new Error("Failed to send interactive full alert")
    }

    return await response.json()
  } catch (error) {
    console.error("Error sending interactive full alert:", error)
    throw error
  }
}
