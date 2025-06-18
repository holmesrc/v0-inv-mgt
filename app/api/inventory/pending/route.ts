import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables")
}

const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: "Database not configured",
        data: [],
      })
    }

    const { data, error } = await supabase.from("pending_changes").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching pending changes:", error)
      return NextResponse.json({
        success: false,
        error: error.message,
        data: [],
      })
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error("Error in GET /api/inventory/pending:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: [],
    })
  }
}

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
    const { changeType, itemData, originalData, requestedBy } = body

    // Validate required fields
    if (!changeType || !requestedBy) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: changeType, requestedBy",
        },
        { status: 400 },
      )
    }

    // Insert pending change
    const { data, error } = await supabase
      .from("pending_changes")
      .insert({
        change_type: changeType,
        item_data: itemData,
        original_data: originalData,
        requested_by: requestedBy,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating pending change:", error)
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
      data,
      message: "Change submitted for approval",
    })
  } catch (error) {
    console.error("Error in POST /api/inventory/pending:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
