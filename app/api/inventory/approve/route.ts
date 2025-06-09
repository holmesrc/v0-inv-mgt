import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, canUseSupabase } from "@/lib/supabase"

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

    const { changeId, action, approvedBy } = await request.json()

    if (!changeId || !action || !approvedBy) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      )
    }

    const supabase = createServerSupabaseClient()

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
          error: "Pending change not found",
        },
        { status: 404 },
      )
    }

    if (action === "approve") {
      // Apply the change to the inventory
      const { change_type, item_data, original_data } = pendingChange

      if (change_type === "add") {
        // Add new item to inventory
        const { error: insertError } = await supabase.from("inventory").insert({
          part_number: item_data.part_number,
          mfg_part_number: item_data.mfg_part_number,
          qty: item_data.qty,
          part_description: item_data.part_description,
          supplier: item_data.supplier,
          location: item_data.location,
          package: item_data.package,
          reorder_point: item_data.reorder_point,
          last_updated: new Date().toISOString(),
        })

        if (insertError) {
          throw new Error(`Failed to add item: ${insertError.message}`)
        }
      } else if (change_type === "delete") {
        // Delete item from inventory
        const { error: deleteError } = await supabase
          .from("inventory")
          .delete()
          .eq("part_number", original_data.part_number)

        if (deleteError) {
          throw new Error(`Failed to delete item: ${deleteError.message}`)
        }
      } else if (change_type === "update") {
        // Update existing item
        const { error: updateError } = await supabase
          .from("inventory")
          .update({
            part_number: item_data.part_number,
            mfg_part_number: item_data.mfg_part_number,
            qty: item_data.qty,
            part_description: item_data.part_description,
            supplier: item_data.supplier,
            location: item_data.location,
            package: item_data.package,
            reorder_point: item_data.reorder_point,
            last_updated: new Date().toISOString(),
          })
          .eq("part_number", original_data.part_number)

        if (updateError) {
          throw new Error(`Failed to update item: ${updateError.message}`)
        }
      }
    }

    // Update the pending change status
    const { error: updateError } = await supabase
      .from("pending_changes")
      .update({
        status: action === "approve" ? "approved" : "rejected",
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .eq("id", changeId)

    if (updateError) {
      console.error("Error updating pending change:", updateError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update change status",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: `Change ${action}d successfully`,
    })
  } catch (error) {
    console.error("Error in approve route:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Server error",
      },
      { status: 500 },
    )
  }
}
