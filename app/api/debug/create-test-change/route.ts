import { NextResponse } from "next/server"

export async function POST() {
  console.log("=== CREATE TEST CHANGE API STARTED ===")

  try {
    // Step 1: Basic response test
    console.log("Step 1: Starting create test change")

    const result: any = {
      success: true,
      message: "Create test change started",
      steps: [],
    }

    // Step 2: Check environment variables
    console.log("Step 2: Environment variable check")
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      result.steps.push({
        step: "Environment Variables",
        success: !!supabaseUrl && !!supabaseKey,
        details: {
          supabaseUrl: !!supabaseUrl,
          supabaseKey: !!supabaseKey,
        },
      })

      if (!supabaseUrl || !supabaseKey) {
        result.success = false
        result.error = "Missing Supabase environment variables"
        console.log("Environment variables missing")

        return NextResponse.json(result, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }
    } catch (envError) {
      console.error("Environment check error:", envError)
      result.success = false
      result.error = "Environment check failed"
      result.steps.push({
        step: "Environment Variables",
        success: false,
        error: envError instanceof Error ? envError.message : "Unknown error",
      })

      return NextResponse.json(result, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Step 3: Try to import and create Supabase client
    console.log("Step 3: Supabase client setup")
    try {
      const { createClient } = await import("@/lib/supabase")
      const supabase = createClient()

      result.steps.push({
        step: "Supabase Client Setup",
        success: true,
        details: "Successfully created Supabase client",
      })

      // Step 4: Create test change data
      console.log("Step 4: Preparing test change data")
      const testChange = {
        change_type: "add",
        part_number: `TEST-${Math.floor(Math.random() * 10000)}`,
        description: `Test Item ${new Date().toISOString()}`,
        current_stock: 10,
        min_stock: 5,
        supplier: "Test Supplier",
        location: "Test Location",
        package: "Test Package",
        requested_by: "Debug User",
        status: "pending",
      }

      result.steps.push({
        step: "Test Data Preparation",
        success: true,
        details: testChange,
      })

      // Step 5: Insert into database
      console.log("Step 5: Database insert")
      try {
        const { data, error } = await supabase.from("pending_changes").insert(testChange).select().single()

        if (error) {
          result.steps.push({
            step: "Database Insert",
            success: false,
            error: error.message,
            details: error,
          })
          result.success = false
          result.error = `Database insert failed: ${error.message}`
        } else if (!data) {
          result.steps.push({
            step: "Database Insert",
            success: false,
            error: "No data returned from insert",
          })
          result.success = false
          result.error = "No data returned from insert operation"
        } else {
          result.steps.push({
            step: "Database Insert",
            success: true,
            details: "Successfully inserted test change",
          })
          result.changeId = data.id
          result.message = `Test change created successfully with ID: ${data.id}`
        }
      } catch (dbError) {
        console.error("Database insert error:", dbError)
        result.steps.push({
          step: "Database Insert",
          success: false,
          error: dbError instanceof Error ? dbError.message : "Unknown database error",
        })
        result.success = false
        result.error = "Database insert failed"
      }
    } catch (supabaseError) {
      console.error("Supabase setup error:", supabaseError)
      result.steps.push({
        step: "Supabase Client Setup",
        success: false,
        error: supabaseError instanceof Error ? supabaseError.message : "Unknown Supabase error",
      })
      result.success = false
      result.error = "Supabase setup failed"
    }

    console.log("=== CREATE TEST CHANGE API COMPLETED ===")
    console.log("Result:", JSON.stringify(result, null, 2))

    return NextResponse.json(result, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("=== CREATE TEST CHANGE API FAILED ===")
    console.error("Unexpected error:", error)

    const errorResponse = {
      success: false,
      error: "Unexpected error in create test change",
      details: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
