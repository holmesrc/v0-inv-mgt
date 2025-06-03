import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("=== SLACK INTERACTION RECEIVED ===")
  console.log("Timestamp:", new Date().toISOString())
  console.log("URL:", request.url)
  console.log("Method:", request.method)
  console.log("Headers:", Object.fromEntries(request.headers.entries()))

  try {
    const body = await request.text()
    console.log("Raw body length:", body.length)
    console.log("Raw body preview:", body.substring(0, 200))

    // Parse the payload from Slack
    let payload
    try {
      if (body.startsWith("payload=")) {
        const encodedPayload = body.split("payload=")[1]
        console.log("Encoded payload preview:", encodedPayload.substring(0, 100))
        payload = JSON.parse(decodeURIComponent(encodedPayload))
      } else {
        payload = JSON.parse(body)
      }
    } catch (parseError) {
      console.error("❌ Error parsing payload:", parseError)
      console.log("Body that failed to parse:", body)
      // Return empty response immediately to prevent "Action received"
      return new NextResponse("", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      })
    }

    console.log("✅ Parsed payload successfully")
    console.log("Payload type:", payload.type)
    console.log("User:", payload.user?.name || payload.user?.id)
    console.log("Channel:", payload.channel?.id || payload.channel?.name)

    const { type, actions, user, response_url, channel } = payload

    if (type === "block_actions" && actions && actions.length > 0) {
      const action = actions[0]
      console.log("🔘 Action details:")
      console.log("  - action_id:", action.action_id)
      console.log("  - value:", action.value)
      console.log("  - user:", user?.name || user?.id)

      if (action.action_id === "show_all_low_stock") {
        console.log("🚀 Processing show_all_low_stock action")

        // Handle this immediately and synchronously
        try {
          await handleShowAllLowStock(channel?.id || "#inventory-alerts")
          console.log("✅ Show all low stock handled successfully")
        } catch (error) {
          console.error("❌ Error handling show all low stock:", error)
        }
      } else if (action.action_id?.startsWith("reorder_")) {
        console.log("🛒 Processing reorder action")
        // Handle reorder button clicks
        const partNumber = action.value
        console.log("Reorder requested for:", partNumber)

        // You could send a response or trigger the purchase request shortcut
        try {
          await handleReorderAction(partNumber, user, channel?.id)
          console.log("✅ Reorder action handled successfully")
        } catch (error) {
          console.error("❌ Error handling reorder action:", error)
        }
      } else {
        console.log("⚠️ Unknown action_id:", action.action_id)
      }
    } else {
      console.log("⚠️ Not a block_actions type or no actions found")
      console.log("Type:", type)
      console.log("Actions:", actions)
    }

    console.log("🔄 Returning empty response to prevent 'Action received'")

    // Always return empty response immediately to prevent "Action received" message
    return new NextResponse("", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "X-Slack-No-Retry": "1",
      },
    })
  } catch (error) {
    console.error("❌ Critical error in interaction handler:", error)
    // Even on error, return empty response to prevent "Action received"
    return new NextResponse("", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })
  }
}

async function handleShowAllLowStock(channelId: string) {
  console.log("📋 Starting handleShowAllLowStock for channel:", channelId)

  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      throw new Error("Slack webhook URL not configured")
    }

    console.log("🔗 Using webhook URL:", webhookUrl.substring(0, 50) + "...")

    // Use mock data that matches what would be in the dashboard
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
      {
        partNumber: "BC547B-ND",
        description: "TRANS NPN 45V 0.1A TO-92",
        supplier: "ON Semiconductor",
        location: "K11-L12",
        currentStock: 2,
        reorderPoint: 12,
      },
      {
        partNumber: "LM358P-ND",
        description: "IC OPAMP DUAL GP 8DIP",
        supplier: "Texas Instruments",
        location: "M13-N14",
        currentStock: 3,
        reorderPoint: 8,
      },
    ]

    console.log("📦 Prepared", mockItems.length, "items for full alert")

    // Import our function to create the blocks
    const { createSimpleFullLowStockBlocks } = await import("@/lib/slack")
    const blocks = createSimpleFullLowStockBlocks(mockItems)

    console.log("🧱 Created", blocks.length, "blocks for Slack message")
    console.log("📤 Sending to channel:", channelId)

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

    console.log("📡 Webhook response status:", response.status)
    console.log("📡 Webhook response ok:", response.ok)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Slack webhook error:", errorText)
      throw new Error(`Slack API error: ${response.status} - ${errorText}`)
    }

    const responseText = await response.text()
    console.log("✅ Slack webhook response:", responseText)
    console.log("🎉 Full alert sent successfully")
  } catch (error) {
    console.error("💥 Error in handleShowAllLowStock:", error)
    throw error
  }
}

async function handleReorderAction(partNumber: string, user: any, channelId: string) {
  console.log("🛒 Processing reorder for part:", partNumber)

  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      throw new Error("Slack webhook URL not configured")
    }

    // Send a confirmation message
    const message = `✅ Reorder initiated for *${partNumber}* by ${user?.name || user?.id}

Please use this shortcut to complete the purchase request:
https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031`

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channelId,
        text: message,
        username: "Inventory Bot",
        icon_emoji: ":package:",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Slack API error: ${response.status} - ${errorText}`)
    }

    console.log("✅ Reorder confirmation sent")
  } catch (error) {
    console.error("❌ Error sending reorder confirmation:", error)
    throw error
  }
}
