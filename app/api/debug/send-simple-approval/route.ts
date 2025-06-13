import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { sendApprovalNotification } from "@/lib/slack"

export async function POST(request: NextRequest) {
  try {
    const { changeId } = await request.json()

    if (!changeId) {
      return NextResponse.json({ success: false, error: "Change ID is required" }, { status: 400 })
    }

    const supabase = createClient()

    // Get the change details
    const { data: change, error } = await supabase.from("pending_changes").select("*").eq("id", changeId).single()

    if (error || !change) {
      console.error("Error fetching change:", error)
      return NextResponse.json({ success: false, error: "Change not found" }, { status: 404 })
    }

    // Send the notification
    const result = await sendApprovalNotification(change)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Approval notification sent successfully",
    })
  } catch (error) {
    console.error("Error in send simple approval API:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
