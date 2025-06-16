import { type NextRequest, NextResponse } from "next/server"
import { createCleanLowStockAlertMessage, sendSlackMessage } from "@/lib/slack"

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json()

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: "Invalid items data" }, { status: 400 })
    }

    console.log("Testing clean low stock alert with", items.length, "items")

    // Create the clean message
    const message = createCleanLowStockAlertMessage(items)

    console.log("Clean message created:", message.substring(0, 200) + "...")
    console.log("Message length:", message.length, "characters")

    // Send the message
    const result = await sendSlackMessage(message)

    return NextResponse.json({
      success: result.success,
      error: result.error,
      messageLength: message.length,
      messagePreview: message.substring(0, 200) + "...",
    })
  } catch (error) {
    console.error("Error testing clean alert:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
