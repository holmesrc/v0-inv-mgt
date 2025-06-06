import { NextResponse } from "next/server"
import { createServerSupabaseClient, canUseSupabase } from "@/lib/supabase"

export async function GET() {
  try {
    console.log("=== SYNC TEST STARTED ===")

    // Step 1: Check if Supabase is configured
    console.log("Step 1: Checking Supabase configuration...")
    if (!canUseSupabase()) {
      console.log("❌ Supabase not configured")
      return NextResponse.json(
        {
          success: false,
          error: "Supabase is not configured",
          configured: false,
        },
        { status: 503 },
      )
    }
    console.log("✅ Supabase is configured")

    // Step 2: Create Supabase client
    console.log("Step 2: Creating Supabase client...")
    let supabase
    try {
      supabase = createServerSupabaseClient()
      console.log("✅ Supabase client created")
    } catch (clientError) {
      console.error("❌ Error creating Supabase client:", clientError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create database connection",
          details: clientError instanceof Error ? clientError.message : "Unknown client error",
        },
        { status: 500 },
      )
    }

    // Step 3: Test database connection
    console.log("Step 3: Testing database connection...")
    try {
      const { data: testData, error: testError } = await supabase.from("inventory").select("count").limit(1)

      if (testError) {
        console.error("❌ Database connection test failed:", testError)
        return NextResponse.json(
          {
            success: false,
            error: "Database connection failed",
            details: testError.message,
          },
          { status: 500 },
        )
      }
      console.log("✅ Database connection successful")
    } catch (connectionError) {
      console.error("❌ Database connection error:", connectionError)
      return NextResponse.json(
        {
          success: false,
          error: "Database connection error",
          details: connectionError instanceof Error ? connectionError.message : "Unknown connection error",
        },
        { status: 500 },
      )
    }

    // Step 4: Test write permission
    console.log("Step 4: Testing write permission...")
    try {
      // Create a test record
      const testItem = {
        part_number: `test-${Date.now()}`,
        mfg_part_number: "TEST-MFG",
        qty: 999,
        part_description: "Test Item - Safe to Delete",
        supplier: "Test Supplier",
        location: "Test Location",
        package: "Test Package",
        reorder_point: 10,
        last_updated: new Date().toISOString(),
      }

      const { error: insertError } = await supabase.from("inventory").insert(testItem)

      if (insertError) {
        console.error("❌ Write permission test failed:", insertError)
        return NextResponse.json(
          {
            success: false,
            error: "Write permission test failed",
            details: insertError.message,
          },
          { status: 500 },
        )
      }
      console.log("✅ Write permission test successful")

      // Clean up test record
      const { error: deleteError } = await supabase.from("inventory").delete().eq("part_number", testItem.part_number)

      if (deleteError) {
        console.warn("⚠️ Could not clean up test record:", deleteError)
      } else {
        console.log("✅ Test record cleaned up")
      }
    } catch (writeError) {
      console.error("❌ Write permission test error:", writeError)
      return NextResponse.json(
        {
          success: false,
          error: "Write permission test error",
          details: writeError instanceof Error ? writeError.message : "Unknown write error",
        },
        { status: 500 },
      )
    }

    // Step 5: Check environment variables
    console.log("Step 5: Checking environment variables...")
    const envVars = {
      SUPABASE_URL: process.env.SUPABASE_URL ? "✅ Set" : "❌ Missing",
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ Set" : "❌ Missing",
      NODE_ENV: process.env.NODE_ENV || "not set",
      VERCEL_ENV: process.env.VERCEL_ENV || "not set",
    }
    console.log("Environment variables:", envVars)

    // All tests passed
    console.log("=== SYNC TEST COMPLETED SUCCESSFULLY ===")
    return NextResponse.json({
      success: true,
      message: "All sync tests passed successfully",
      environment: envVars,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("=== SYNC TEST CRITICAL ERROR ===")
    console.error("Critical error during sync test:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Critical error during sync test",
        details: error instanceof Error ? error.message : "Unknown critical error",
      },
      { status: 500 },
    )
  }
}
