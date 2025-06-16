import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== FUNCTION VERSION CHECK ===")

    // Import all the functions to check their current state
    const slackModule = await import("@/lib/slack")

    // Test sample data
    const sampleItems = [
      {
        partNumber: "TEST-123",
        description: "Test Component",
        supplier: "Test Supplier",
        location: "A1-B2",
        currentStock: 5,
        reorderPoint: 10,
      },
    ]

    // Check what each function produces
    const results = {
      createCleanLowStockAlertMessage: null as any,
      createLowStockAlertMessage: null as any,
      createSimplestLowStockMessage: null as any,
      sendInteractiveLowStockAlert: null as any,
    }

    try {
      results.createCleanLowStockAlertMessage = slackModule.createCleanLowStockAlertMessage(sampleItems)
    } catch (e) {
      results.createCleanLowStockAlertMessage = `Error: ${e instanceof Error ? e.message : "Unknown"}`
    }

    try {
      results.createLowStockAlertMessage = slackModule.createLowStockAlertMessage
        ? slackModule.createLowStockAlertMessage(sampleItems)
        : "Function not found"
    } catch (e) {
      results.createLowStockAlertMessage = `Error: ${e instanceof Error ? e.message : "Unknown"}`
    }

    try {
      results.createSimplestLowStockMessage = slackModule.createSimplestLowStockMessage(sampleItems)
    } catch (e) {
      results.createSimplestLowStockMessage = `Error: ${e instanceof Error ? e.message : "Unknown"}`
    }

    // Check what sendInteractiveLowStockAlert would call (without actually sending)
    try {
      // We can't easily test this without sending, so we'll just check if it exists
      results.sendInteractiveLowStockAlert =
        typeof slackModule.sendInteractiveLowStockAlert === "function" ? "Function exists" : "Function missing"
    } catch (e) {
      results.sendInteractiveLowStockAlert = `Error: ${e instanceof Error ? e.message : "Unknown"}`
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      functionCheck: results,
      analysis: {
        cleanMessageLength:
          typeof results.createCleanLowStockAlertMessage === "string"
            ? results.createCleanLowStockAlertMessage.length
            : 0,
        cleanMessageHasEmojis:
          typeof results.createCleanLowStockAlertMessage === "string"
            ? /[^\x00-\x7F]/.test(results.createCleanLowStockAlertMessage)
            : false,
        cleanMessageHasShortcuts:
          typeof results.createCleanLowStockAlertMessage === "string"
            ? results.createCleanLowStockAlertMessage.includes("slack.com/shortcuts")
            : false,
      },
    })
  } catch (error) {
    console.error("Error checking function versions:", error)
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
