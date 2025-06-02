import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    console.log("Received interaction payload:", body)

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

    console.log("Parsed payload:", JSON.stringify(payload, null, 2))
    const { type, actions, user, response_url, channel } = payload

    if (type === "block_actions" && actions && actions.length > 0) {
      const action = actions[0]
      console.log("Handling action:", action.action_id)

      if (action.action_id === "show_all_low_stock") {
        // Handle this in a non-blocking way
        handleShowAllLowStock(channel?.id || "#inventory-alerts")
          .then(() => console.log("Show all low stock handled successfully"))
          .catch((error) => console.error("Error handling show all low stock:", error))
      }
    }

    // Always return an empty 200 response immediately to prevent "Action received" message
    return new NextResponse("", { status: 200 })
  } catch (error) {
    console.error("Error handling Slack interaction:", error)
    return new NextResponse("", { status: 200 })
  }
}

async function handleShowAllLowStock(channelId: string) {
  try {
    console.log("Handling show all low stock for channel:", channelId)

    // Use mock data for now - in a real app this would come from your database
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

    // Send a new message with all items directly to the channel
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      throw new Error("Slack webhook URL not configured")
    }

    // Import our function to create the blocks
    const { createSimpleFullLowStockBlocks } = await import("@/lib/slack")
    const blocks = createSimpleFullLowStockBlocks(mockItems)

    // Send as a new message to the channel
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channelId,
        text: `🚨 Complete Low Stock Report: ${mockItems.length} items below reorder point`,
        blocks: blocks,
        username: "Inventory Bot",
        icon_emoji: ":package:",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Slack API error: ${response.status} - ${errorText}`)
    }

    console.log("Full alert sent successfully")
  } catch (error) {
    console.error("Error in handleShowAllLowStock:", error)
    throw error
  }
}
