import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables")
}

const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          error: "Database not configured",
        },
        { status: 500 },
      )
    }

    const body = await request.json()
    const { changeId, action, approvedBy } = body

    // Validate required fields
    if (!changeId || !action || !approvedBy) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: changeId, action, approvedBy",
        },
        { status: 400 },
      )
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action. Must be 'approve' or 'reject'",
        },
        { status: 400 },
      )
    }

    // Get the pending change
    const { data: pendingChange, error: fetchError } = await supabase
      .from("pending_changes")
      .select("*")
      .eq("id", changeId)
      .eq("status", "pending")
      .single()

    if (fetchError || !pendingChange) {
      return NextResponse.json(
        {
          success: false,
          error: "Pending change not found or already processed",
        },
        { status: 404 },
      )
    }

    if (action === "reject") {
      // Just update the status to rejected
      const { error: updateError } = await supabase
        .from("pending_changes")
        .update({
          status: "rejected",
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
        })
        .eq("id", changeId)

      if (updateError) {
        console.error("Error updating pending change:", updateError)
        return NextResponse.json(
          {
            success: false,
            error: updateError.message,
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,
        message: "Change rejected successfully",
      })
    }

    // Handle approval - apply the change to the inventory
    let inventoryResult = null

    if (pendingChange.change_type === "add") {
      // Add new item
      const { data, error } = await supabase.from("inventory").insert(pendingChange.item_data).select().single()

      if (error) {
        console.error("Error adding inventory item:", error)
        return NextResponse.json(
          {
            success: false,
            error: `Failed to add item: ${error.message}`,
          },
          { status: 500 },
        )
      }
      inventoryResult = data
    } else if (pendingChange.change_type === "update") {
      // Update existing item
      const { data, error } = await supabase
        .from("inventory")
        .update(pendingChange.item_data)
        .eq("part_number", pendingChange.original_data.part_number)
        .select()
        .single()

      if (error) {
        console.error("Error updating inventory item:", error)
        return NextResponse.json(
          {
            success: false,
            error: `Failed to update item: ${error.message}`,
          },
          { status: 500 },
        )
      }
      inventoryResult = data
    } else if (pendingChange.change_type === "delete") {
      // Delete item
      const { error } = await supabase
        .from("inventory")
        .delete()
        .eq("part_number", pendingChange.original_data.part_number)

      if (error) {
        console.error("Error deleting inventory item:", error)
        return NextResponse.json(
          {
            success: false,
            error: `Failed to delete item: ${error.message}`,
          },
          { status: 500 },
        )
      }
    }

    // Update the pending change status
    const { error: updateError } = await supabase
      .from("pending_changes")
      .update({
        status: "approved",
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .eq("id", changeId)

    if (updateError) {
      console.error("Error updating pending change:", updateError)
      return NextResponse.json(
        {
          success: false,
          error: updateError.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Change approved and applied successfully",
      inventoryResult,
    })
  } catch (error) {
    console.error("Error in POST /api/inventory/approve:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
