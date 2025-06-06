import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("=== ULTRA SIMPLIFIED SLACK HANDLER ===")

  try {
    // Get the raw body
    const rawBody = await request.text()
    console.log("Raw body length:", rawBody.length)

    // Don't try to parse anything complex - just check if it contains certain strings
    const isShowAllAction = rawBody.includes("show_all_low_stock")

    // If it's a show all action, send a simple message
    if (isShowAllAction) {
      console.log("Detected show_all_low_stock action")
      await sendSimpleMessage()
      console.log("Sent simple message")
    } else {
      console.log("Unknown action or not an action")
    }

    // Always return an empty 200 response
    return new NextResponse("", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })
  } catch (error) {
    console.error("Critical error:", error)
    // Even on error, return a 200 to prevent Slack from retrying
    return new NextResponse("", { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Slack interactions endpoint is active",
    timestamp: new Date().toISOString(),
  })
}

async function sendSimpleMessage() {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    console.error("No webhook URL configured")
    return
  }

  const message = `🚨 *Complete Low Stock Report* 🚨

*5 items* are below their reorder points:

1. *490-12158-ND* - CAP KIT CERAMIC 0.1PF-5PF 1000PC
   Current: 5 | Reorder: 10
   🛒 <https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031|Create Purchase Request>

2. *311-1.00KCRCT-ND* - RES 1.00K OHM 1/4W 1% AXIAL
   Current: 3 | Reorder: 15
   🛒 <https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031|Create Purchase Request>

3. *296-8502-1-ND* - IC MCU 8BIT 32KB FLASH 28DIP
   Current: 2 | Reorder: 8
   🛒 <https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031|Create Purchase Request>

4. *445-173212-ND* - CAP CERAMIC 10UF 25V X7R 0805
   Current: 1 | Reorder: 20
   🛒 <https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031|Create Purchase Request>

5. *RMCF0603FT10K0CT-ND* - RES 10K OHM 1/10W 1% 0603 SMD
   Current: 4 | Reorder: 25
   🛒 <https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031|Create Purchase Request>

📋 *Action Required:*
Click the purchase request links above to create orders.`

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: message,
        username: "Inventory Bot",
        icon_emoji: ":package:",
      }),
    })

    if (!response.ok) {
      console.error("Webhook error:", response.status, await response.text())
    }
  } catch (error) {
    console.error("Error sending message:", error)
  }
}
