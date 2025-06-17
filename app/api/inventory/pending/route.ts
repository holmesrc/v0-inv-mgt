import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, canUseSupabase } from "@/lib/supabase"

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

    const { data: pendingChanges, error } = await supabase
      .from("pending_changes")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching pending changes:", error)
      return NextResponse.json({
        success: false,
        error: "Failed to fetch pending changes",
      })
    }

    return NextResponse.json({
      success: true,
      data: pendingChanges || [],
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

    return NextResponse.json({
      success: true,
      data: pendingChange,
      message: "Change submitted for approval",
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
