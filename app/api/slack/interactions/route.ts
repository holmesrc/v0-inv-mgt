import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const payload = JSON.parse(decodeURIComponent(body.split("payload=")[1]))

    const { type, actions, user, response_url, channel } = payload

    if (type === "block_actions") {
      const action = actions[0]

      switch (action.action_id) {
        case "show_all_low_stock":
          await handleShowAllLowStock(action.value, response_url, channel, user)
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

    // Return empty response to prevent "Action received" message
    return new NextResponse("", { status: 200 })
  } catch (error) {
    console.error("Error handling Slack interaction:", error)
    return NextResponse.json({ error: "Failed to handle interaction" }, { status: 500 })
  }
}

async function handleShowAllLowStock(value: string, responseUrl: string, channel: any, user: any) {
  try {
    // Send an ephemeral message first to acknowledge the click
    await fetch(responseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        response_type: "ephemeral",
        text: "📋 Fetching complete low stock report...",
      }),
    })

    // Now send the full alert to the channel using our webhook
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (webhookUrl) {
      // Import the function to create full low stock blocks
      const { createFullLowStockBlocks } = await import("@/lib/slack")

      // We need to get the current low stock items
      // Since we don't have access to the inventory here, we'll send a request to our API
      const response = await fetch(`${process.env.VERCEL_URL || "http://localhost:3000"}/api/inventory/low-stock`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const { items } = await response.json()
        const blocks = createFullLowStockBlocks(items)

        await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channel: channel.id,
            text: `🚨 Complete Low Stock Report: ${items.length} items below reorder point`,
            blocks: blocks,
            username: "Inventory Bot",
            icon_emoji: ":package:",
          }),
        })

        // Send a follow-up ephemeral message
        await fetch(responseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            response_type: "ephemeral",
            text: "✅ Complete low stock report has been posted to the channel above!",
          }),
        })
      } else {
        // Fallback if we can't get the inventory
        await fetch(responseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            response_type: "ephemeral",
            text: "❌ Unable to fetch current inventory. Please use the dashboard to send a full alert manually.",
          }),
        })
      }
    }
  } catch (error) {
    console.error("Error showing all low stock items:", error)

    // Send error message
    await fetch(responseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        response_type: "ephemeral",
        text: "❌ Error fetching complete report. Please use the dashboard to send a full alert manually.",
      }),
    })
  }
}

async function handleApproveReorder(itemJson: string, user: any, responseUrl: string) {
  try {
    const item = JSON.parse(itemJson)

    // Send ephemeral response to the user
    await fetch(responseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        response_type: "ephemeral",
        text: `✅ *Reorder Approved by ${user.name}*\n\nPart: ${item.partNumber} - ${item.description}\n\nPlease use the Purchase Request shortcut to complete the order: https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031`,
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

    // Send ephemeral response to the user
    await fetch(responseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        response_type: "ephemeral",
        text: `❌ *Reorder Denied by ${user.name}*\n\nPart: ${item.partNumber} - ${item.description}\n\nReason: Manual review required`,
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
    // Since the button has a URL, this action might not be triggered
    // But if it is, we'll send an ephemeral response
    await fetch(responseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        response_type: "ephemeral",
        text: `🛒 *Reorder Button Clicked*\n\nYou should be redirected to the Purchase Request shortcut to complete the order.\n\nIf the shortcut didn't open, use this link: https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031`,
      }),
    })
  } catch (error) {
    console.error("Error handling reorder item:", error)
  }
}
