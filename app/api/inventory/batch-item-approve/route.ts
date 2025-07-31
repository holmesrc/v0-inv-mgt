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
    const { batchId, itemIndex, action, approvedBy } = body

    // Validate required fields
    if (!batchId || itemIndex === undefined || !action || !approvedBy) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: batchId, itemIndex, action, approvedBy",
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

    const itemToProcess = batchItems[itemIndex]

    if (action === "approve") {
      // Add the individual item to inventory using only existing columns
      const inventoryItem = {
        part_number: String(itemToProcess.part_number || "").trim(),
        mfg_part_number: String(itemToProcess.mfg_part_number || "").trim(),
        qty: Number(itemToProcess.qty) || 0,
        part_description: String(itemToProcess.part_description || "").trim(),
        supplier: String(itemToProcess.supplier || "").trim(),
        location: String(itemToProcess.location || "").trim(),
        package: String(itemToProcess.package || "").trim(),
        reorder_point: Number(itemToProcess.reorder_point) || 10,
        // Removed created_at and updated_at as they don't exist in the schema
      }

      try {
        const { data, error } = await supabase.from("inventory").insert(inventoryItem).select().single()

        if (error) {
          console.error("Error adding individual batch item:", error, "Item data:", inventoryItem)
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
          message: `Item ${itemToProcess.part_number} approved and added to inventory`,
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
    } else {
      // For rejection, we just return success (item is not added to inventory)
      return NextResponse.json({
        success: true,
        message: `Item ${itemToProcess.part_number} rejected`,
      })
    }
  } catch (error) {
    console.error("Error in POST /api/inventory/batch-item-approve:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
