import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("=== SLACK INTERACTION RECEIVED ===")
  console.log("Timestamp:", new Date().toISOString())

  try {
    const body = await request.text()
    console.log("Raw body length:", body.length)
    console.log("Raw body preview:", body.substring(0, 300))

    // Parse the payload from Slack
    let payload
    try {
      if (body.startsWith("payload=")) {
        const encodedPayload = body.split("payload=")[1]
        payload = JSON.parse(decodeURIComponent(encodedPayload))
      } else {
        payload = JSON.parse(body)
      }
    } catch (parseError) {
      console.error("❌ Error parsing main payload:", parseError)
      return new NextResponse("", { status: 200 })
    }

    console.log("✅ Parsed payload successfully")
    console.log("Payload type:", payload.type)

    const { type, actions, user, channel } = payload

    if (type === "block_actions" && actions && actions.length > 0) {
      const action = actions[0]
      console.log("🔘 Action received:")
      console.log("  - action_id:", action.action_id)
      console.log("  - value:", action.value)

      if (action.action_id === "show_all_low_stock") {
        console.log("🚀 Processing show_all_low_stock action")

        // Handle the show all action
        try {
          await sendFullLowStockMessage(channel?.id || "#inventory-alerts")
          console.log("✅ Full low stock message sent")
        } catch (error) {
          console.error("❌ Error sending full message:", error)
        }
      } else if (action.action_id?.startsWith("reorder_")) {
        console.log("🛒 Processing reorder action")
        const partNumber = action.value || "unknown"

        try {
          await sendReorderConfirmation(partNumber, user, channel?.id)
          console.log("✅ Reorder confirmation sent")
        } catch (error) {
          console.error("❌ Error sending reorder confirmation:", error)
        }
      }
    }

    // Always return empty response to prevent "Action received" message
    return new NextResponse("", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })
  } catch (error) {
    console.error("❌ Critical error:", error)
    return new NextResponse("", { status: 200 })
  }
}

async function sendFullLowStockMessage(channelId: string) {
  console.log("📋 Sending full low stock message to:", channelId)

  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    throw new Error("Slack webhook URL not configured")
  }

  // Mock data for the full report
  const items = [
    {
      partNumber: "490-12158-ND",
      description: "CAP KIT CERAMIC 0.1PF-5PF 1000PC",
      currentStock: 5,
      reorderPoint: 10,
      supplier: "Digi-Key",
      location: "A1-B2",
    },
    {
      partNumber: "311-1.00KCRCT-ND",
      description: "RES 1.00K OHM 1/4W 1% AXIAL",
      currentStock: 3,
      reorderPoint: 15,
      supplier: "Digi-Key",
      location: "C3-D4",
    },
    {
      partNumber: "296-8502-1-ND",
      description: "IC MCU 8BIT 32KB FLASH 28DIP",
      currentStock: 2,
      reorderPoint: 8,
      supplier: "Microchip",
      location: "E5-F6",
    },
    {
      partNumber: "445-173212-ND",
      description: "CAP CERAMIC 10UF 25V X7R 0805",
      currentStock: 1,
      reorderPoint: 20,
      supplier: "TDK",
      location: "G7-H8",
    },
    {
      partNumber: "RMCF0603FT10K0CT-ND",
      description: "RES 10K OHM 1/10W 1% 0603 SMD",
      currentStock: 4,
      reorderPoint: 25,
      supplier: "Stackpole",
      location: "I9-J10",
    },
  ]

  let message = `🚨 *Complete Low Stock Report* 🚨\n\n`
  message += `*${items.length} items* are below their reorder points:\n\n`

  items.forEach((item, index) => {
    message += `${index + 1}. *${item.partNumber}* - ${item.description}\n`
    message += `   Current: ${item.currentStock} | Reorder: ${item.reorderPoint}\n`
    message += `   Supplier: ${item.supplier} | Location: ${item.location}\n`
    message += `   🛒 <https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031|Create Purchase Request>\n\n`
  })

  message += `📋 *Next Steps:*\n`
  message += `• Click the purchase request links above\n`
  message += `• Send completed requests to #PHL10-hw-lab-requests`

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

  console.log("✅ Full message sent successfully")
}

async function sendReorderConfirmation(partNumber: string, user: any, channelId: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    throw new Error("Slack webhook URL not configured")
  }

  const message = `✅ Reorder initiated for *${partNumber}* by ${user?.name || user?.id}\n\nUse this shortcut to complete: https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031`

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
}
