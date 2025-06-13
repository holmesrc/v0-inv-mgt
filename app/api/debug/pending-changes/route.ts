import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, canUseSupabase } from "@/lib/supabase"
import { sendApprovalNotification } from "@/lib/slack"

// GET all pending changes
export async function GET() {
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

    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from("pending_changes").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching pending changes:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error("Error in GET pending changes:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// DELETE selected pending changes
export async function DELETE(request: NextRequest) {
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

    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No IDs provided",
        },
        { status: 400 },
      )
    }

    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from("pending_changes").delete().in("id", ids)

    if (error) {
      console.error("Error deleting changes:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: `${ids.length} changes deleted`,
    })
  } catch (error) {
    console.error("Error in DELETE pending changes:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// PATCH to update status of selected pending changes
export async function PATCH(request: NextRequest) {
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

    const { ids, status, processChanges = false, sendNotification = false } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No IDs provided",
        },
        { status: 400 },
      )
    }

    if (!status || !["approved", "rejected", "pending", "processing", "failed"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid status",
        },
        { status: 400 },
      )
    }

    const supabase = createServerSupabaseClient()

    // First, get all the changes we're updating
    const { data: changes, error: fetchError } = await supabase.from("pending_changes").select("*").in("id", ids)

    if (fetchError) {
      console.error("Error fetching changes:", fetchError)
      return NextResponse.json(
        {
          success: false,
          error: fetchError.message,
        },
        { status: 500 },
      )
    }

    // Update the status of all changes
    const { error: updateError } = await supabase.from("pending_changes").update({ status }).in("id", ids)

    if (updateError) {
      console.error("Error updating changes:", updateError)
      return NextResponse.json(
        {
          success: false,
          error: updateError.message,
        },
        { status: 500 },
      )
    }

    // If we need to process the changes, do that now
    const results = []
    if (processChanges && status === "approved") {
      for (const change of changes || []) {
        try {
          if (change.change_type === "add") {
            // Extract item data from the pending change
            let itemData = change.item_data || {}

            // For direct field access (newer format)
            if (change.part_number) {
              itemData = {
                part_number: change.part_number,
                mfg_part_number: change.mfg_part_number || change.part_number,
                qty: change.current_stock,
                part_description: change.description,
                supplier: change.supplier,
                location: change.location,
                package: change.package,
                reorder_point: change.min_stock,
                notes: change.notes,
              }
            }

            console.log("Adding item to inventory:", JSON.stringify(itemData, null, 2))

            // Add new item to inventory
            const { error: insertError } = await supabase.from("inventory").insert(itemData)

            if (insertError) {
              console.error("Error adding inventory item:", insertError)
              results.push({
                id: change.id,
                success: false,
                error: insertError.message,
              })
              continue
            }

            results.push({
              id: change.id,
              success: true,
              message: "Item added to inventory",
            })
          } else if (change.change_type === "delete") {
            // Extract part number from the pending change
            let partNumber = null

            if (change.original_data?.part_number) {
              partNumber = change.original_data.part_number
            } else if (change.part_number) {
              partNumber = change.part_number
            }

            if (!partNumber) {
              console.error("Missing part number for deletion")
              results.push({
                id: change.id,
                success: false,
                error: "Missing part number for deletion",
              })
              continue
            }

            console.log(`Deleting item with part number: ${partNumber}`)

            // Delete the item by part number
            const { error: deleteError } = await supabase.from("inventory").delete().eq("part_number", partNumber)

            if (deleteError) {
              console.error("Error deleting inventory item:", deleteError)
              results.push({
                id: change.id,
                success: false,
                error: deleteError.message,
              })
              continue
            }

            results.push({
              id: change.id,
              success: true,
              message: `Item ${partNumber} deleted from inventory`,
            })
          } else if (change.change_type === "update") {
            // Extract part number and updated data from the pending change
            let partNumber = null
            const itemData = change.item_data || {}

            if (change.original_data?.part_number) {
              partNumber = change.original_data.part_number
            } else if (change.part_number) {
              partNumber = change.part_number
            }

            if (!partNumber) {
              console.error("Missing part number for update")
              results.push({
                id: change.id,
                success: false,
                error: "Missing part number for update",
              })
              continue
            }

            console.log(`Updating item with part number: ${partNumber}`)

            // Update the item by part number
            const { error: updateError } = await supabase
              .from("inventory")
              .update(itemData)
              .eq("part_number", partNumber)

            if (updateError) {
              console.error("Error updating inventory item:", updateError)
              results.push({
                id: change.id,
                success: false,
                error: updateError.message,
              })
              continue
            }

            results.push({
              id: change.id,
              success: true,
              message: `Item ${partNumber} updated in inventory`,
            })
          }
        } catch (error) {
          console.error(`Error processing change ${change.id}:`, error)
          results.push({
            id: change.id,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }
    }

    // If we need to send notifications, do that now
    const notificationResults = []
    if (sendNotification) {
      for (const change of changes || []) {
        try {
          const result = await sendApprovalNotification(change)
          notificationResults.push({
            id: change.id,
            success: result.success,
            message: result.success ? "Notification sent" : result.error,
          })
        } catch (error) {
          console.error(`Error sending notification for change ${change.id}:`, error)
          notificationResults.push({
            id: change.id,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${ids.length} changes updated to ${status}`,
      processResults: processChanges ? results : undefined,
      notificationResults: sendNotification ? notificationResults : undefined,
    })
  } catch (error) {
    console.error("Error in PATCH pending changes:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
