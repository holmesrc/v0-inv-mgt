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
    const { batchItems, requestedBy } = body

    console.log("📥 Received batch submission:", {
      itemCount: batchItems?.length,
      requestedBy,
      firstItem: batchItems?.[0],
    })

    // Validate required fields
    if (!batchItems || !Array.isArray(batchItems) || batchItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Batch items are required",
        },
        { status: 400 },
      )
    }

    if (!requestedBy) {
      return NextResponse.json(
        {
          success: false,
          error: "Requester name is required",
        },
        { status: 400 },
      )
    }

    // Create a single batch pending change
    const batchData = {
      change_type: "batch_add",
      item_data: {
        batch_items: batchItems,
        item_count: batchItems.length,
        summary: `Batch addition of ${batchItems.length} items`,
        batch_id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
      original_data: null,
      requested_by: requestedBy,
      status: "pending",
    }

    console.log("💾 Creating batch pending change:", {
      change_type: batchData.change_type,
      item_count: batchData.item_data.item_count,
      requested_by: batchData.requested_by,
    })

    const { data, error } = await supabase.from("pending_changes").insert(batchData).select().single()

    if (error) {
      console.error("❌ Error creating batch pending change:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 },
      )
    }

    console.log("✅ Batch pending change created successfully:", data.id)

    return NextResponse.json({
      success: true,
      data,
      message: `Batch of ${batchItems.length} items submitted for approval`,
    })
  } catch (error) {
    console.error("❌ Error in POST /api/inventory/batch-pending:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
