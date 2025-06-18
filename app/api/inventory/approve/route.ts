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

    console.log("Approval request received:", { changeId, action, approvedBy })

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
      console.error("Error fetching pending change:", fetchError)
      return NextResponse.json(
        {
          success: false,
          error: "Pending change not found or already processed",
        },
        { status: 404 },
      )
    }

    console.log("Found pending change:", pendingChange)

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
    const inventoryResults = []

    if (pendingChange.change_type === "add") {
      // Handle regular single item add
      const inventoryItem = {
        part_number: String(pendingChange.item_data.part_number || "").trim(),
        mfg_part_number: String(pendingChange.item_data.mfg_part_number || "").trim(),
        qty: Number(pendingChange.item_data.qty) || 0,
        part_description: String(pendingChange.item_data.part_description || "").trim(),
        supplier: String(pendingChange.item_data.supplier || "").trim(),
        location: String(pendingChange.item_data.location || "").trim(),
        package: String(pendingChange.item_data.package || "").trim(),
        reorder_point: Number(pendingChange.item_data.reorder_point) || 10,
      }

      const { data, error } = await supabase.from("inventory").insert(inventoryItem).select().single()

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
      inventoryResults.push(data)
    } else if (pendingChange.change_type === "batch_add" || pendingChange.item_data?.is_batch === true) {
      // Handle batch add - process all items in the batch
      const batchItems = pendingChange.item_data?.batch_items || []

      if (batchItems.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "No batch items found to process",
          },
          { status: 400 },
        )
      }

      console.log(`Processing ${batchItems.length} batch items`)

      // Process each item in the batch individually
      for (const item of batchItems) {
        // Transform the item data to match the database schema
        const inventoryItem = {
          part_number: String(item.part_number || "").trim(),
          mfg_part_number: String(item.mfg_part_number || "").trim(),
          qty: Number(item.qty) || 0,
          part_description: String(item.part_description || "").trim(),
          supplier: String(item.supplier || "").trim(),
          location: String(item.location || "").trim(),
          package: String(item.package || "").trim(),
          reorder_point: Number(item.reorder_point) || 10,
        }

        console.log("Adding batch item:", inventoryItem)

        try {
          const { data, error } = await supabase.from("inventory").insert(inventoryItem).select().single()

          if (error) {
            console.error("Error adding batch item:", error, "Item data:", inventoryItem)
            return NextResponse.json(
              {
                success: false,
                error: `Failed to add item ${item.part_number}: ${error.message}`,
              },
              { status: 500 },
            )
          }

          inventoryResults.push(data)
          console.log(`Successfully added item: ${item.part_number}`)
        } catch (itemError) {
          console.error("Exception adding batch item:", itemError)
          return NextResponse.json(
            {
              success: false,
              error: `Failed to add item ${item.part_number}: ${itemError instanceof Error ? itemError.message : "Unknown error"}`,
            },
            { status: 500 },
          )
        }
      }

      console.log(`Successfully added ${inventoryResults.length} batch items to inventory`)
    } else if (pendingChange.change_type === "update") {
      // Update existing item
      const updateData = {
        qty: Number(pendingChange.item_data.qty) || 0,
        reorder_point: Number(pendingChange.item_data.reorder_point) || 10,
        location: String(pendingChange.item_data.location || "").trim(),
        supplier: String(pendingChange.item_data.supplier || "").trim(),
        package: String(pendingChange.item_data.package || "").trim(),
      }

      const { data, error } = await supabase
        .from("inventory")
        .update(updateData)
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
      inventoryResults.push(data)
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
      message: `Change approved and applied successfully. ${inventoryResults.length} item(s) processed.`,
      inventoryResults,
      itemsProcessed: inventoryResults.length,
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
