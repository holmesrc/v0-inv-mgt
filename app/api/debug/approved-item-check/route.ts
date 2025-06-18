import { NextResponse } from "next/server"
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
      })
    }

    console.log("=== APPROVED ITEM DEBUG CHECK ===")

    // 1. Check for the specific item in inventory
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from("inventory")
      .select("*")
      .ilike("location", "%H3-187%")

    console.log("Items at location H3-187:", inventoryItems)

    // 2. Check for the specific part number
    const { data: specificPart, error: partError } = await supabase
      .from("inventory")
      .select("*")
      .ilike("part_number", "%81-GJM0336C1E150GB1D%")

    console.log("Specific part 81-GJM0336C1E150GB1D:", specificPart)

    // 3. Check recent approved changes
    const { data: approvedChanges, error: changesError } = await supabase
      .from("pending_changes")
      .select("*")
      .eq("status", "approved")
      .order("approved_at", { ascending: false })
      .limit(10)

    console.log("Recent approved changes:", approvedChanges)

    // 4. Check all inventory items (last 20 added)
    const { data: recentInventory, error: recentError } = await supabase
      .from("inventory")
      .select("*")
      .order("id", { ascending: false })
      .limit(20)

    console.log("Recent inventory items:", recentInventory)

    // 5. Check for any items with similar part numbers
    const { data: similarParts, error: similarError } = await supabase
      .from("inventory")
      .select("*")
      .ilike("part_number", "%GJM0336%")

    console.log("Similar part numbers:", similarParts)

    return NextResponse.json({
      success: true,
      debug_info: {
        items_at_h3_187: inventoryItems || [],
        specific_part_search: specificPart || [],
        recent_approved_changes: approvedChanges || [],
        recent_inventory_items: recentInventory || [],
        similar_part_numbers: similarParts || [],
      },
      summary: {
        items_at_location: inventoryItems?.length || 0,
        specific_part_found: specificPart?.length || 0,
        recent_approvals: approvedChanges?.length || 0,
        total_recent_items: recentInventory?.length || 0,
        similar_parts: similarParts?.length || 0,
      },
    })
  } catch (error) {
    console.error("Error in approved item debug check:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
