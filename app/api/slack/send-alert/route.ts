import { type NextRequest, NextResponse } from "next/server"
import { sendLowStockAlert } from "@/lib/slack"

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json()

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: "Invalid items data" }, { status: 400 })
    }

    console.log(`Sending Slack alert for ${items.length} low stock items`)

    const result = await sendLowStockAlert(items)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Alert sent successfully for ${result.itemCount} items`,
        itemCount: result.itemCount,
      })
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in send-alert API:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
