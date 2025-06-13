import { NextResponse } from "next/server"
import { sendApprovalNotification } from "@/lib/slack"

export async function POST() {
  try {
    // Create a sample pending change for testing
    const sampleChange = {
      id: `test-${Date.now()}`,
      change_type: "add",
      item_data: {
        part_number: "TEST-123",
        part_description: "Test Part for Slack Notification",
        qty: 10,
        supplier: "Test Supplier",
        location: "Test Location",
        package: "TEST",
      },
      requested_by: "Debug User",
      status: "pending",
      created_at: new Date().toISOString(),
    }

    // Send the approval notification directly without creating a DB record
    console.log("Sending sample approval notification:", sampleChange)
    const result = await sendApprovalNotification(sampleChange)

    return NextResponse.json({
      success: result.success,
      message: result.success ? "Approval notification sent successfully" : "Failed to send approval notification",
      error: result.error,
      details: "This was a test notification and no actual change was created in the database.",
    })
  } catch (error) {
    console.error("Error in send-approval API route:", error)
    // Ensure we always return a valid JSON response
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
