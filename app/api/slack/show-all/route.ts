import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json({ error: "Slack webhook URL not configured" }, { status: 500 })
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

    // Send the message to Slack
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: message,
        username: "Inventory Bot",
        icon_emoji: ":package:",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: `Slack API error: ${response.status} - ${errorText}` }, { status: 500 })
    }

    // Redirect to a success page
    return NextResponse.redirect(new URL("/slack-success", request.url))
  } catch (error) {
    console.error("Error sending full report:", error)
    return NextResponse.json({ error: "Failed to send full report" }, { status: 500 })
  }
}
