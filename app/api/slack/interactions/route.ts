import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const payload = JSON.parse(decodeURIComponent(body.split("payload=")[1]))

    const { type, actions, user, response_url } = payload

    if (type === "block_actions") {
      const action = actions[0]

      switch (action.action_id) {
        case "show_all_low_stock":
          await handleShowAllLowStock(action.value, response_url)
          break

        case "reorder_item":
          await handleReorderItem(action.value, user, response_url)
          break

        case "approve_reorder":
          await handleApproveReorder(action.value, user, response_url)
          break

        case "deny_reorder":
          await handleDenyReorder(action.value, user, response_url)
          break

        default:
          console.log("Unknown action:", action.action_id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error handling Slack interaction:", error)
    return NextResponse.json({ error: "Failed to handle interaction" }, { status: 500 })
  }
}

async function handleShowAllLowStock(value: string, responseUrl: string) {
  try {
    // Since we're not passing the full items data in the button value anymore,
    // we'll need to get the items from the original message or use a fallback
    // For now, let's send a simple response directing users to the dashboard

    await fetch(responseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        replace_original: true,
        text: "📋 *Complete Low Stock Report*\n\nTo view all low stock items with individual reorder buttons, please:\n\n1. Visit your inventory dashboard\n2. Use the 'Send Full Alert' button to get the complete interactive list\n\nOr use this shortcut directly: https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031",
      }),
    })
  } catch (error) {
    console.error("Error showing all low stock items:", error)
  }
}

async function handleApproveReorder(itemJson: string, user: any, responseUrl: string) {
  try {
    const item = JSON.parse(itemJson)

    // Update the message to show approval
    await fetch(responseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: `✅ *Reorder Approved by ${user.name}*\n\nPart: ${item.partNumber} - ${item.description}\n\nPlease use the Purchase Request shortcut to complete the order: https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031`,
        replace_original: false,
        response_type: "ephemeral",
      }),
    })

    // Send notification to requester (in this case, the same user)
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: `@${user.name}`,
          text: `✅ Your reorder request for *${item.partNumber}* has been approved!\n\nPlease complete the purchase using this shortcut: https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031\n\n*Item Details:*\n• Part: ${item.partNumber} - ${item.description}\n• Supplier: ${item.supplier || "N/A"}\n• Current Stock: ${item.currentStock}\n• Reorder Point: ${item.reorderPoint}`,
          username: "Inventory Bot",
          icon_emoji: ":white_check_mark:",
        }),
      })

      // Send notification to #PHL10-hw-lab-requests channel
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: "#PHL10-hw-lab-requests",
          text: `📦 *New Approved Reorder Request*\n\nApproved by: ${user.name}\nPart: ${item.partNumber} - ${item.description}\nSupplier: ${item.supplier || "N/A"}\nCurrent Stock: ${item.currentStock}\nReorder Point: ${item.reorderPoint}\n\nStatus: Pending purchase completion via shortcut`,
          username: "Inventory Bot",
          icon_emoji: ":package:",
        }),
      })
    }
  } catch (error) {
    console.error("Error handling approve reorder:", error)
  }
}

async function handleDenyReorder(itemJson: string, user: any, responseUrl: string) {
  try {
    const item = JSON.parse(itemJson)

    // Update the message to show denial
    await fetch(responseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: `❌ *Reorder Denied by ${user.name}*\n\nPart: ${item.partNumber} - ${item.description}\n\nReason: Manual review required`,
        replace_original: false,
        response_type: "ephemeral",
      }),
    })

    // Send notification to requester
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: `@${user.name}`,
          text: `❌ Your reorder request for *${item.partNumber}* has been denied.\n\nPart: ${item.partNumber} - ${item.description}\n\nPlease review the inventory levels and reorder criteria, or contact the inventory manager for more information.`,
          username: "Inventory Bot",
          icon_emoji: ":x:",
        }),
      })
    }
  } catch (error) {
    console.error("Error handling deny reorder:", error)
  }
}

async function handleReorderItem(itemJson: string, user: any, responseUrl: string) {
  try {
    const item = JSON.parse(itemJson)

    // Send ephemeral response to the user
    await fetch(responseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: `🛒 *Reorder Initiated for ${item.partNumber}*\n\nYou'll be redirected to the Purchase Request shortcut to complete the order.\n\n*Item Details:*\n• Part: ${item.partNumber} - ${item.description}\n• Supplier: ${item.supplier || "N/A"}\n• Current Stock: ${item.currentStock}\n• Reorder Point: ${item.reorderPoint}`,
        replace_original: false,
        response_type: "ephemeral",
      }),
    })
  } catch (error) {
    console.error("Error handling reorder item:", error)
  }
}
