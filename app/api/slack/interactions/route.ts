import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("=== NEW SLACK INTERACTION HANDLER ===")
  console.log("Timestamp:", new Date().toISOString())

  try {
    const body = await request.text()
    console.log("Raw body received, length:", body.length)

    // Parse the Slack payload
    let payload
    try {
      if (body.startsWith("payload=")) {
        const encodedPayload = body.split("payload=")[1]
        payload = JSON.parse(decodeURIComponent(encodedPayload))
      } else {
        payload = JSON.parse(body)
      }
    } catch (parseError) {
      console.error("❌ Failed to parse Slack payload:", parseError)
      return new NextResponse("", { status: 200 })
    }

    console.log("✅ Successfully parsed Slack payload")
    console.log("Payload type:", payload.type)

    // Handle block actions
    if (payload.type === "block_actions" && payload.actions && payload.actions.length > 0) {
      const action = payload.actions[0]
      console.log("🔘 Processing action:", action.action_id)

      // Handle show all low stock action
      if (action.action_id === "show_all_low_stock") {
        console.log("📋 Handling show all low stock request")

        try {
          await sendCompleteReport(payload.channel?.id || "#inventory-alerts")
          console.log("✅ Complete report sent successfully")
        } catch (error) {
          console.error("❌ Failed to send complete report:", error)
        }
      }
      // Handle reorder actions
      else if (action.action_id && action.action_id.startsWith("reorder_")) {
        console.log("🛒 Handling reorder request")

        try {
          const partNumber = action.value || "unknown"
          await sendReorderResponse(partNumber, payload.user, payload.channel?.id)
          console.log("✅ Reorder response sent successfully")
        } catch (error) {
          console.error("❌ Failed to send reorder response:", error)
        }
      }
      // Unknown action
      else {
        console.log("⚠️ Unknown action received:", action.action_id)
      }
    }

    // Always return empty response to prevent "Action received" message
    return new NextResponse("", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })
  } catch (error) {
    console.error("❌ Critical error in interaction handler:", error)
    return new NextResponse("", { status: 200 })
  }
}

async function sendCompleteReport(channelId: string) {
  console.log("📤 Sending complete low stock report to:", channelId)

  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    throw new Error("Slack webhook URL not configured")
  }

  // Create a simple text message with all low stock items
  const message = `🚨 *Complete Low Stock Report* 🚨

*5 items* are below their reorder points:

1. *490-12158-ND* - CAP KIT CERAMIC 0.1PF-5PF 1000PC
   Current: 5 | Reorder: 10
   Supplier: Digi-Key | Location: A1-B2
   🛒 <https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031|Create Purchase Request>

2. *311-1.00KCRCT-ND* - RES 1.00K OHM 1/4W 1% AXIAL
   Current: 3 | Reorder: 15
   Supplier: Digi-Key | Location: C3-D4
   🛒 <https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031|Create Purchase Request>

3. *296-8502-1-ND* - IC MCU 8BIT 32KB FLASH 28DIP
   Current: 2 | Reorder: 8
   Supplier: Microchip | Location: E5-F6
   🛒 <https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031|Create Purchase Request>

4. *445-173212-ND* - CAP CERAMIC 10UF 25V X7R 0805
   Current: 1 | Reorder: 20
   Supplier: TDK | Location: G7-H8
   🛒 <https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031|Create Purchase Request>

5. *RMCF0603FT10K0CT-ND* - RES 10K OHM 1/10W 1% 0603 SMD
   Current: 4 | Reorder: 25
   Supplier: Stackpole | Location: I9-J10
   🛒 <https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031|Create Purchase Request>

📋 *Action Required:*
Click the purchase request links above to create orders.
Send completed requests to #PHL10-hw-lab-requests channel.`

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
    throw new Error(`Slack webhook failed: ${response.status} - ${errorText}`)
  }

  console.log("✅ Complete report sent to Slack")
}

async function sendReorderResponse(partNumber: string, user: any, channelId: string) {
  console.log("🛒 Sending reorder response for:", partNumber)

  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    throw new Error("Slack webhook URL not configured")
  }

  const message = `✅ Reorder initiated for *${partNumber}* by ${user?.name || user?.id}

Please complete the purchase request using this shortcut:
https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031`

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
    throw new Error(`Slack webhook failed: ${response.status} - ${errorText}`)
  }

  console.log("✅ Reorder response sent to Slack")
}
