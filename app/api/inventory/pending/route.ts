import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, canUseSupabase } from "@/lib/supabase"
import { sendApprovalNotification } from "@/lib/slack"

export async function GET() {
  try {
    if (!canUseSupabase()) {
      return NextResponse.json({
        success: false,
        error: "Database not configured",
        data: [],
      })
    }

    const supabase = createServerSupabaseClient()

    // Get all pending changes, not just those with status="pending"
    const { data: allChanges, error } = await supabase
      .from("pending_changes")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching pending changes:", error)
      return NextResponse.json({
        success: false,
        error: "Failed to fetch pending changes",
      })
    }

    // Filter pending changes on the server side
    const pendingChanges = allChanges?.filter((change) => change.status === "pending") || []

    return NextResponse.json({
      success: true,
      data: pendingChanges,
    })
  } catch (error) {
    console.error("Error in pending changes GET:", error)
    return NextResponse.json({
      success: false,
      error: "Server error",
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!canUseSupabase()) {
      return NextResponse.json(
        {
          success: false,
          error: "Database not configured",
        },
        { status: 503 },
      )
    }

    const { changeType, itemData, originalData, requestedBy } = await request.json()

    const supabase = createServerSupabaseClient()

    // Create pending change record
    const { data: pendingChange, error } = await supabase
      .from("pending_changes")
      .insert({
        change_type: changeType,
        item_data: itemData,
        original_data: originalData,
        requested_by: requestedBy || "Unknown User",
        status: "pending",
      })
      .select("*")
      .single()

    if (error) {
      console.error("Error creating pending change:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create pending change",
        },
        { status: 500 },
      )
    }

    // Send Slack approval notification
    console.log("Sending approval notification for new pending change:", pendingChange.id)
    const notificationResult = await sendApprovalNotification(pendingChange)

    if (!notificationResult.success) {
      console.warn("Failed to send approval notification:", notificationResult.error)
    }

    return NextResponse.json({
      success: true,
      data: pendingChange,
      message: "Change submitted for approval",
      notificationSent: notificationResult.success,
      notificationError: notificationResult.error,
    })
  } catch (error) {
    console.error("Error in pending changes POST:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Server error",
      },
      { status: 500 },
    )
  }
}
