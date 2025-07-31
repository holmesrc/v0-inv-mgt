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
    const { batchId, itemIndex, status, approvedBy } = body

    // Validate required fields
    if (!batchId || itemIndex === undefined || !status || !approvedBy) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: batchId, itemIndex, status, approvedBy",
        },
        { status: 400 },
      )
    }

    if (!["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid status. Must be 'approved', 'rejected', or 'pending'",
        },
        { status: 400 },
      )
    }

    // Get the pending batch change
    const { data: pendingChange, error: fetchError } = await supabase
      .from("pending_changes")
      .select("*")
      .eq("id", batchId)
      .eq("status", "pending")
      .single()

    if (fetchError || !pendingChange) {
      return NextResponse.json(
        {
          success: false,
          error: "Pending batch change not found or already processed",
        },
        { status: 404 },
      )
    }

    // Check if this is a batch operation
    if (!pendingChange.item_data?.is_batch || !pendingChange.item_data?.batch_items) {
      return NextResponse.json(
        {
          success: false,
          error: "This is not a batch operation",
        },
        { status: 400 },
      )
    }

    const batchItems = pendingChange.item_data.batch_items
    if (itemIndex < 0 || itemIndex >= batchItems.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid item index",
        },
        { status: 400 },
      )
    }

    // Update the item status in the batch
    const currentItemStatuses = pendingChange.item_data.item_statuses || {}
    currentItemStatuses[itemIndex] = status

    const updatedItemData = {
      ...pendingChange.item_data,
      item_statuses: currentItemStatuses,
    }

    // Update the pending change with the new item status
    const { error: updateError } = await supabase
      .from("pending_changes")
      .update({
        item_data: updatedItemData,
      })
      .eq("id", batchId)

    if (updateError) {
      console.error("Error updating batch item status:", updateError)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to update item status: ${updateError.message}`,
        },
        { status: 500 },
      )
    }

    // If the item is approved, also add it to inventory immediately
    if (status === "approved") {
      const item = batchItems[itemIndex]

      try {
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

        // Check for duplicates
        const { data: existingItem, error: checkError } = await supabase
          .from("inventory")
          .select("part_number")
          .eq("part_number", inventoryItem.part_number)
          .single()

        if (checkError && checkError.code !== "PGRST116") {
          return NextResponse.json(
            {
              success: false,
              error: `Duplicate check failed: ${checkError.message}`,
            },
            { status: 500 },
          )
        }

        if (existingItem) {
          return NextResponse.json(
            {
              success: false,
              error: "Part number already exists in inventory",
            },
            { status: 400 },
          )
        }

        const { data, error } = await supabase.from("inventory").insert(inventoryItem).select().single()

        if (error) {
          console.error("Error adding individual batch item:", error)
          return NextResponse.json(
            {
              success: false,
              error: `Failed to add item: ${error.message}`,
            },
            { status: 500 },
          )
        }

        return NextResponse.json({
          success: true,
          message: `Item ${item.part_number} ${status} and added to inventory`,
          inventoryResult: data,
        })
      } catch (itemError) {
        console.error("Exception adding individual batch item:", itemError)
        return NextResponse.json(
          {
            success: false,
            error: `Failed to add item: ${itemError instanceof Error ? itemError.message : "Unknown error"}`,
          },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: `Item ${batchItems[itemIndex].part_number} marked as ${status}`,
    })
  } catch (error) {
    console.error("Error in POST /api/inventory/batch-item-status:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
