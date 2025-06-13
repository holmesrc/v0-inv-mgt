import { NextResponse } from "next/server"
import { sendApprovalNotification } from "@/lib/slack"

export async function POST(request: Request) {
  try {
    const { changeType, itemData, originalData, requestedBy, changeId } = await request.json()

    // Create a change object in the format expected by sendApprovalNotification
    const change = {
      id: changeId,
      change_type: changeType,
      item_data: itemData,
      original_data: originalData,
      requested_by: requestedBy,
      status: "pending",
    }

    console.log("Sending approval request for change:", changeId)
    console.log("Change details:", JSON.stringify(change, null, 2))

    // Send the notification
    const result = await sendApprovalNotification(change)

    if (!result.success) {
      console.error("Failed to send approval notification:", result.error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to send approval notification",
          details: result.error,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Approval request sent successfully",
    })
  } catch (error) {
    console.error("Error sending approval request:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send approval request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
