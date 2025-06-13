import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { changeId: string } }) {
  try {
    const { changeId } = params
    console.log(`Fetching pending change with ID: ${changeId}`)

    if (!changeId) {
      return NextResponse.json({ success: false, error: "Change ID is required" }, { status: 400 })
    }

    const supabase = createClient()

    // Get the pending change
    const { data, error } = await supabase.from("pending_changes").select("*").eq("id", changeId).single()

    if (error) {
      console.error("Error fetching pending change:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ success: false, error: "Change not found" }, { status: 404 })
    }

    console.log(`Found pending change: ${JSON.stringify(data, null, 2)}`)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in pending change API:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
