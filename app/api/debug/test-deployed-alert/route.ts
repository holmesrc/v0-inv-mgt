import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json()

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: "Invalid items data" }, { status: 400 })
    }

    console.log("=== DEPLOYED ALERT TEST ===")
    console.log("Testing with", items.length, "items")

    // Import the functions dynamically to ensure we get the latest version
    const { sendInteractiveLowStockAlert, createCleanLowStockAlertMessage, sendSlackMessage } = await import(
      "@/lib/slack"
    )

    // Test 1: Direct clean message
    console.log("Test 1: Creating clean message directly...")
    const cleanMessage = createCleanLowStockAlertMessage(items)
    console.log("Clean message length:", cleanMessage.length)
    console.log("Clean message preview:", cleanMessage.substring(0, 200))

    // Test 2: Send via sendSlackMessage directly
    console.log("Test 2: Sending clean message directly...")
    const directResult = await sendSlackMessage(cleanMessage)
    console.log("Direct send result:", directResult)

    if (!directResult.success) {
      return NextResponse.json({
        success: false,
        error: `Direct send failed: ${directResult.error}`,
        step: "direct_send",
        messageLength: cleanMessage.length,
        messagePreview: cleanMessage.substring(0, 200),
      })
    }

    // Test 3: Send via the dashboard function
    console.log("Test 3: Sending via sendInteractiveLowStockAlert...")
    const dashboardResult = await sendInteractiveLowStockAlert(items)
    console.log("Dashboard send result:", dashboardResult)

    return NextResponse.json({
      success: true,
      directResult,
      dashboardResult,
      messageLength: cleanMessage.length,
      messagePreview: cleanMessage.substring(0, 200),
      tests: {
        directSend: directResult.success,
        dashboardSend: dashboardResult.success,
      },
    })
  } catch (error) {
    console.error("Error in deployed alert test:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
