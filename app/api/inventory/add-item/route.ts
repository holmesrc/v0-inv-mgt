import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, canUseSupabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  console.log("=== ADD ITEM API CALLED ===")

  try {
    // Step 1: Check if Supabase is configured
    console.log("Step 1: Checking Supabase configuration...")
    if (!canUseSupabase()) {
      console.log("❌ Supabase not configured")
      return NextResponse.json(
        {
          error: "Supabase is not configured. Data will be stored locally only.",
          configured: false,
        },
        { status: 503 },
      )
    }
    console.log("✅ Supabase is configured")

    // Step 2: Parse request body
    console.log("Step 2: Parsing request body...")
    let item, requester
    try {
      const requestBody = await request.json()
      item = requestBody.item
      requester = requestBody.requester
      console.log("✅ Request body parsed successfully")
      console.log("Item:", item)
      console.log("Requester:", requester)
    } catch (parseError) {
      console.error("❌ Error parsing request body:", parseError)
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseError instanceof Error ? parseError.message : "Unknown parsing error",
        },
        { status: 400 },
      )
    }

    // Step 3: Validate item data
    console.log("Step 3: Validating item data...")
    if (!item || typeof item !== "object") {
      console.error("❌ Invalid item data:", typeof item)
      return NextResponse.json({ error: "Invalid item data - must be an object" }, { status: 400 })
    }

    if (!item["Part number"] || typeof item["Part number"] !== "string" || !item["Part number"].trim()) {
      console.error("❌ Missing part number")
      return NextResponse.json({ error: "Part number is required" }, { status: 400 })
    }
    console.log("✅ Item data is valid")

    // Step 4: Create Supabase client
    console.log("Step 4: Creating Supabase client...")
    let supabase
    try {
      supabase = createServerSupabaseClient()
      console.log("✅ Supabase client created")
    } catch (clientError) {
      console.error("❌ Error creating Supabase client:", clientError)
      return NextResponse.json(
        {
          error: "Failed to create database connection",
          details: clientError instanceof Error ? clientError.message : "Unknown client error",
        },
        { status: 500 },
      )
    }

    // Step 5: Transform item data
    console.log("Step 5: Transforming item data...")
    const transformedItem = {
      part_number: String(item["Part number"]).trim(),
      mfg_part_number: String(item["MFG Part number"] || "").trim(),
      qty: isNaN(Number(item.QTY)) ? 0 : Math.max(0, Number(item.QTY)),
      part_description: String(item["Part description"] || "").trim(),
      supplier: String(item.Supplier || "").trim(),
      location: String(item.Location || "").trim(),
      package: String(item.Package || "").trim(),
      reorder_point: isNaN(Number(item.reorderPoint)) ? 10 : Math.max(0, Number(item.reorderPoint)),
      last_updated: new Date().toISOString(),
    }
    console.log("✅ Item transformed:", transformedItem)

    // Step 6: Create pending change for approval instead of direct insert
    console.log("Step 6: Creating pending change for approval...")
    const { error: pendingError } = await supabase
      .from('pending_changes')
      .insert({
        change_type: 'add',
        requested_by: requester,
        status: 'pending',
        item_data: {
          // Fields for display system
          part_number: transformedItem.part_number,
          mfg_part_number: transformedItem.mfg_part_number,
          part_description: transformedItem.part_description,
          quantity: transformedItem.qty,
          location: transformedItem.location,
          supplier: transformedItem.supplier,
          package: transformedItem.package,
          reorder_point: transformedItem.reorder_point,
          
          // Additional data for processing
          action_type: 'add_item',
          new_item_data: transformedItem
        }
      })

    if (pendingError) {
      console.error("❌ Error creating pending change:", pendingError)
      return NextResponse.json(
        {
          error: "Failed to create pending change",
          details: pendingError.message,
          code: pendingError.code,
        },
        { status: 500 },
      )
    }

    console.log("✅ Pending change created successfully")

    // Step 7: Send Slack notification
    try {
      const slackResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://v0-inv-mgt.vercel.app'}/api/slack/send-approval-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changeType: 'add',
          itemData: {
            part_number: transformedItem.part_number,
            part_description: transformedItem.part_description,
            qty: transformedItem.qty,
            location: transformedItem.location,
            supplier: transformedItem.supplier,
            package: transformedItem.package,
            reorder_point: transformedItem.reorder_point
          },
          requestedBy: requester,
          changeId: `add-${transformedItem.part_number}-${Date.now()}`
        })
      })

      if (!slackResponse.ok) {
        console.error('Slack notification failed:', await slackResponse.text())
        // Don't fail the whole request if Slack fails
      } else {
        console.log('Slack notification sent successfully')
      }
    } catch (slackError) {
      console.error('Error sending Slack notification:', slackError)
      // Don't fail the whole request if Slack fails
    }

    // Step 8: Return success response
    return NextResponse.json({
      success: true,
      message: "Item submitted for approval",
    })
  } catch (error) {
    console.error("=== ADD ITEM CRITICAL ERROR ===")
    console.error("Critical error adding item:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return NextResponse.json(
      {
        error: "Critical error adding item",
        details: error instanceof Error ? error.message : "Unknown critical error",
        type: error instanceof Error ? error.constructor.name : "Unknown",
      },
      { status: 500 },
    )
  }
}
