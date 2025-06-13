import { NextResponse } from "next/server"
import { sendApprovalNotification } from "@/lib/slack"

export async function POST(request: Request) {
  try {
    const { testMode } = await request.json()

    // Create a test change object
    const testChange = {
      id: `test-${Date.now()}`,
      change_type: "add",
      part_number: "TEST-001",
      description: "Test Component for Slack Integration",
      requested_by: "Test User",
      created_at: new Date().toISOString(),
    }

    console.log("🧪 Testing approval notification with test change:", testChange)

    const result = await sendApprovalNotification(testChange)

    console.log("📡 Approval notification result:", result)

    if (result.skipped) {
      return NextResponse.json({
        success: true,
        message: "Approval notification test completed (Slack not configured)",
        skipped: true,
        reason: result.reason,
      })
    }

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        message: "Approval notification test failed",
      })
    }

    return NextResponse.json({
      success: true,
      message: "Approval notification test completed successfully",
      details: result,
    })
  } catch (error) {
    console.error("❌ Approval notification test failed:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Approval notification test failed with exception",
    })
  }
}
