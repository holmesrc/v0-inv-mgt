import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()

    // Parse the payload from Slack
    let payload
    try {
      if (body.startsWith("payload=")) {
        payload = JSON.parse(decodeURIComponent(body.split("payload=")[1]))
      } else {
        payload = JSON.parse(body)
      }
    } catch (parseError) {
      console.error("Error parsing payload:", parseError)
      return new NextResponse("", { status: 200 })
    }

    const { type, actions, user, response_url, channel } = payload

    if (type === "block_actions" && actions && actions.length > 0) {
      const action = actions[0]
      console.log("Handling action:", action.action_id)

      switch (action.action_id) {
        case "show_all_low_stock":
          await handleShowAllLowStock(response_url, channel)
          break

        case "reorder_item":
          await handleReorderItem(user, response_url)
          break

        default:
          console.log("Unknown action:", action.action_id)
      }
    }

    // Always return empty response to prevent "Action received" message
    return new NextResponse("", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    })
  } catch (error) {
    console.error("Error handling Slack interaction:", error)
    return new NextResponse("", { status: 200 })
  }
}

async function handleShowAllLowStock(responseUrl: string, channel: any) {
  try {
    console.log("Handling show all low stock")

    // Send ephemeral acknowledgment
    await fetch(responseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        response_type: "ephemeral",
        text: "📋 Sending complete low stock report to channel...",
      }),
    })

    // Send the full alert using our existing API
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (webhookUrl) {
      // Get current inventory from our mock data or use the dashboard's current state
      // For now, we'll use mock data - in a real app this would come from your database
      const mockItems = [
        {
          partNumber: "490-12158-ND",
          description: "CAP KIT CERAMIC 0.1PF-5PF 1000PC",
          supplier: "Digi-Key",
          location: "A1-B2",
          currentStock: 5,
          reorderPoint: 10,
        },
        {
          partNumber: "311-1.00KCRCT-ND",
          description: "RES 1.00K OHM 1/4W 1% AXIAL",
          supplier: "Digi-Key",
          location: "C3-D4",
          currentStock: 3,
          reorderPoint: 15,
        },
        {
          partNumber: "296-8502-1-ND",
          description: "IC MCU 8BIT 32KB FLASH 28DIP",
          supplier: "Microchip",
          location: "E5-F6",
          currentStock: 2,
          reorderPoint: 8,
        },
        {
          partNumber: "445-173212-ND",
          description: "CAP CERAMIC 10UF 25V X7R 0805",
          supplier: "TDK",
          location: "G7-H8",
          currentStock: 1,
          reorderPoint: 20,
        },
        {
          partNumber: "RMCF0603FT10K0CT-ND",
          description: "RES 10K OHM 1/10W 1% 0603 SMD",
          supplier: "Stackpole",
          location: "I9-J10",
          currentStock: 4,
          reorderPoint: 25,
        },
      ]

      // Import our function to create the blocks
      const { createFullLowStockBlocks } = await import("@/lib/slack")
      const blocks = createFullLowStockBlocks(mockItems)

      // Send the full report as a new message
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: channel?.id || "#inventory-alerts",
          text: `🚨 Complete Low Stock Report: ${mockItems.length} items below reorder point`,
          blocks: blocks,
          username: "Inventory Bot",
          icon_emoji: ":package:",
        }),
      })

      console.log("Full alert sent successfully")
    }
  } catch (error) {
    console.error("Error in handleShowAllLowStock:", error)

    // Send error message
    await fetch(responseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        response_type: "ephemeral",
        text: "❌ Error sending complete report. Please try using the dashboard.",
      }),
    })
  }
}

async function handleReorderItem(user: any, responseUrl: string) {
  try {
    console.log("Handling reorder item for user:", user?.name)

    // Send ephemeral response that doesn't replace the original message
    await fetch(responseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        response_type: "ephemeral",
        text: `🛒 *Reorder initiated by ${user?.name || "User"}*\n\nYou should be redirected to the Purchase Request shortcut.\n\nIf it didn't open automatically, use this link:\nhttps://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031`,
      }),
    })
  } catch (error) {
    console.error("Error in handleReorderItem:", error)
  }
}
