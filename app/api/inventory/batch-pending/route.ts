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
      console.error("❌ Supabase not configured")
      return NextResponse.json(
        {
          success: false,
          error: "Database not configured. Please check environment variables.",
        },
        { status: 500 },
      )
    }

    const body = await request.json()
    const { batchItems, requestedBy } = body

    console.log("📥 Received batch submission:", {
      itemCount: batchItems?.length,
      requestedBy,
      firstItem: batchItems?.[0],
    })

    // Validate required fields
    if (!batchItems || !Array.isArray(batchItems) || batchItems.length === 0) {
      console.error("❌ Invalid batch items:", batchItems)
      return NextResponse.json(
        {
          success: false,
          error: "Batch items are required and must be a non-empty array",
        },
        { status: 400 },
      )
    }

    if (!requestedBy || typeof requestedBy !== "string" || requestedBy.trim().length === 0) {
      console.error("❌ Invalid requester:", requestedBy)
      return NextResponse.json(
        {
          success: false,
          error: "Requester name is required and must be a non-empty string",
        },
        { status: 400 },
      )
    }

    // Validate each batch item
    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i]
      if (!item.part_number || typeof item.part_number !== "string" || item.part_number.trim().length === 0) {
        console.error(`❌ Invalid part number for item ${i}:`, item)
        return NextResponse.json(
          {
            success: false,
            error: `Item ${i + 1}: Part number is required and must be a non-empty string`,
          },
          { status: 400 },
        )
      }
    }

    // Use 'add' change_type but mark as batch in item_data to work with existing schema
    const batchData = {
      change_type: "add", // Using existing allowed value
      item_data: {
        is_batch: true, // Flag to indicate this is a batch operation
        batch_items: batchItems,
        item_count: batchItems.length,
        summary: `Batch addition of ${batchItems.length} items`,
        batch_id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        requested_by: requestedBy.trim(),
        description: `Batch addition of ${batchItems.length} items requested by ${requestedBy.trim()}`,
        operation_type: "batch_add", // Store the actual operation type here
      },
      original_data: null,
      requested_by: requestedBy.trim(),
      status: "pending",
    }

    console.log("💾 Creating batch pending change:", {
      change_type: batchData.change_type,
      is_batch: batchData.item_data.is_batch,
      item_count: batchData.item_data.item_count,
      requested_by: batchData.requested_by,
      batch_id: batchData.item_data.batch_id,
    })

    // Insert the batch pending change
    const { data, error } = await supabase.from("pending_changes").insert(batchData).select().single()

    if (error) {
      console.error("❌ Error creating batch pending change:", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })

      return NextResponse.json(
        {
          success: false,
          error: `Database error: ${error.message}`,
        },
        { status: 500 },
      )
    }

    console.log("✅ Batch pending change created successfully:", {
      id: data.id,
      change_type: data.change_type,
      is_batch: data.item_data?.is_batch,
      item_count: data.item_data?.item_count,
    })

    return NextResponse.json({
      success: true,
      data,
      message: `Batch of ${batchItems.length} items submitted for approval`,
    })
  } catch (error) {
    console.error("❌ Unexpected error in POST /api/inventory/batch-pending:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 },
    )
  }
}
