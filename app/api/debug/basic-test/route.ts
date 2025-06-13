import { NextResponse } from "next/server"

export async function GET() {
  console.log("=== BASIC DEBUG TEST STARTED ===")

  try {
    // Step 1: Check if we can return a basic response
    console.log("Step 1: Basic response test")

    const result: any = {
      success: true,
      message: "Basic test started",
      steps: [],
    }

    // Step 2: Check environment variables
    console.log("Step 2: Environment variable check")
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      result.steps.push({
        step: "Environment Variables",
        success: true,
        details: {
          supabaseUrl: !!supabaseUrl,
          supabaseKey: !!supabaseKey,
          supabaseUrlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + "..." : "missing",
        },
      })

      if (!supabaseUrl || !supabaseKey) {
        result.success = false
        result.error = "Missing Supabase environment variables"
        console.log("Environment variables missing")

        return NextResponse.json(result, {
          status: 200, // Return 200 even for config errors
          headers: { "Content-Type": "application/json" },
        })
      }
    } catch (envError) {
      console.error("Environment check error:", envError)
      result.steps.push({
        step: "Environment Variables",
        success: false,
        error: envError instanceof Error ? envError.message : "Unknown error",
      })
    }

    // Step 3: Try to import Supabase
    console.log("Step 3: Supabase import test")
    try {
      const { createClient } = await import("@/lib/supabase")
      result.steps.push({
        step: "Supabase Import",
        success: true,
        details: "Successfully imported createClient",
      })

      // Step 4: Try to create Supabase client
      console.log("Step 4: Supabase client creation")
      try {
        const supabase = createClient()
        result.steps.push({
          step: "Supabase Client Creation",
          success: true,
          details: "Successfully created Supabase client",
        })

        // Step 5: Try a simple query
        console.log("Step 5: Database connection test")
        try {
          const { data, error } = await supabase.from("pending_changes").select("count").limit(1)

          if (error) {
            result.steps.push({
              step: "Database Connection",
              success: false,
              error: error.message,
              details: error,
            })
          } else {
            result.steps.push({
              step: "Database Connection",
              success: true,
              details: "Successfully connected to database",
            })
          }
        } catch (dbError) {
          console.error("Database connection error:", dbError)
          result.steps.push({
            step: "Database Connection",
            success: false,
            error: dbError instanceof Error ? dbError.message : "Unknown database error",
          })
        }
      } catch (clientError) {
        console.error("Supabase client creation error:", clientError)
        result.steps.push({
          step: "Supabase Client Creation",
          success: false,
          error: clientError instanceof Error ? clientError.message : "Unknown client error",
        })
      }
    } catch (importError) {
      console.error("Supabase import error:", importError)
      result.steps.push({
        step: "Supabase Import",
        success: false,
        error: importError instanceof Error ? importError.message : "Unknown import error",
      })
    }

    console.log("=== BASIC DEBUG TEST COMPLETED ===")
    console.log("Result:", JSON.stringify(result, null, 2))

    return NextResponse.json(result, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("=== BASIC DEBUG TEST FAILED ===")
    console.error("Unexpected error:", error)

    // Make absolutely sure we return JSON
    const errorResponse = {
      success: false,
      error: "Unexpected error in basic test",
      details: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
