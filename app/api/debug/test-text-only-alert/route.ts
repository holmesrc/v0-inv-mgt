import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { items } = await request.json()

    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json({ error: "Slack webhook URL not configured" }, { status: 500 })
    }

    // Create a text-only version (no blocks, no complex formatting)
    const textOnlyMessage = {
      text: `Low Stock Alert: ${items.length} items need attention. First item: ${items[0]?.partNumber || "Unknown"} - Current: ${items[0]?.currentStock || 0}`,
    }

    console.log("Sending text-only message:", JSON.stringify(textOnlyMessage, null, 2))

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(textOnlyMessage),
    })

    const responseText = await response.text()
    console.log(`Text-only response (${response.status}):`, responseText)

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText} - ${responseText}`)
    }

    return NextResponse.json({
      success: true,
      message: "Text-only alert sent successfully",
      messageSize: JSON.stringify(textOnlyMessage).length,
    })
  } catch (error) {
    console.error("Error sending text-only alert:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
