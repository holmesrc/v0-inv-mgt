import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function GET() {
  try {
    // Create a test pending change
    const supabase = createClient()

    // Generate a unique ID for the test change
    const testId = `test_${Date.now()}`

    // Create a test pending change
    const { data: change, error } = await supabase
      .from("pending_changes")
      .insert({
        id: testId,
        change_type: "add",
        part_number: "TEST-PART",
        description: "Test Part for Slack Interaction",
        current_stock: 10,
        supplier: "Test Supplier",
        location: "Test Location",
        package: "Test Package",
        requested_by: "Slack Debug Tool",
        status: "pending",
      })
      .select()

    if (error) {
      console.error("Error creating test change:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Return the test change ID
    return NextResponse.json({
      success: true,
      message: "Test change created successfully",
      changeId: testId,
      change: change[0],
    })
  } catch (error) {
    console.error("Error creating test change:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
