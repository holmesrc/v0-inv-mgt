import { type NextRequest, NextResponse } from "next/server"
import { sendInteractiveLowStockAlert } from "@/lib/slack"

interface LowStockItem {
  partNumber: string
  description: string
  supplier: string
  location: string
  currentStock: number
  reorderPoint: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items } = body

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: "Invalid items data" }, { status: 400 })
    }

    if (items.length === 0) {
      return NextResponse.json({ success: false, error: "No items to alert" }, { status: 400 })
    }

    // Use the secure function
    const result = await sendInteractiveLowStockAlert(items)

    return NextResponse.json({
      success: result.success,
      itemCount: result.itemCount,
      message: result.success ? `Alert sent for ${result.itemCount} items` : "Alert failed",
      // NO SENSITIVE DATA in response
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        // NO ERROR DETAILS that could expose sensitive info
      },
      { status: 500 },
    )
  }
}
