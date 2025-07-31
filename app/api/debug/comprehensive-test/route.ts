import { NextResponse } from "next/server"
import { createServerSupabaseClient, canUseSupabase } from "@/lib/supabase"

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [] as any[],
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
    },
    supabaseConfig: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Missing",
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Missing",
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "Set" : "Missing",
    },
  }

  // Test 1: Basic Configuration
  try {
    const configTest = canUseSupabase()
    results.tests.push({
      name: "Configuration Check",
      status: configTest ? "PASS" : "FAIL",
      details: configTest ? "Supabase configuration is valid" : "Supabase configuration is invalid",
    })
  } catch (error) {
    results.tests.push({
      name: "Configuration Check",
      status: "ERROR",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }

  // Test 2: Client Creation
  let supabase
  try {
    supabase = createServerSupabaseClient()
    results.tests.push({
      name: "Client Creation",
      status: "PASS",
      details: "Supabase client created successfully",
    })
  } catch (error) {
    results.tests.push({
      name: "Client Creation",
      status: "ERROR",
      details: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json(results)
  }

  // Test 3: Database Connection
  try {
    const { data, error } = await supabase.from("inventory").select("count").limit(1)
    if (error) {
      results.tests.push({
        name: "Database Connection",
        status: "FAIL",
        details: `Connection failed: ${error.message}`,
        error: error,
      })
    } else {
      results.tests.push({
        name: "Database Connection",
        status: "PASS",
        details: "Successfully connected to database",
      })
    }
  } catch (error) {
    results.tests.push({
      name: "Database Connection",
      status: "ERROR",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }

  // Test 4: Table Structure Check
  try {
    const { data, error } = await supabase.from("inventory").select("*").limit(1)

    if (error) {
      results.tests.push({
        name: "Table Structure",
        status: "FAIL",
        details: `Table access failed: ${error.message}`,
        error: error,
      })
    } else {
      results.tests.push({
        name: "Table Structure",
        status: "PASS",
        details: "Inventory table exists and is accessible",
      })
    }
  } catch (error) {
    results.tests.push({
      name: "Table Structure",
      status: "ERROR",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }

  // Test 5: Write Permission Test
  try {
    const testItem = {
      part_number: `TEST-${Date.now()}`,
      mfg_part_number: "TEST-MFG",
      qty: 1,
      part_description: "Test item for diagnostic",
      supplier: "Test Supplier",
      location: "Test Location",
      package: "Test Package",
      reorder_point: 10,
      last_updated: new Date().toISOString(),
    }

    const { data: insertData, error: insertError } = await supabase.from("inventory").insert([testItem]).select()

    if (insertError) {
      results.tests.push({
        name: "Write Permission Test",
        status: "FAIL",
        details: `Insert failed: ${insertError.message}`,
        error: insertError,
      })
    } else {
      results.tests.push({
        name: "Write Permission Test",
        status: "PASS",
        details: "Successfully inserted test item",
      })

      // Clean up test item
      if (insertData && insertData.length > 0) {
        await supabase.from("inventory").delete().eq("id", insertData[0].id)
      }
    }
  } catch (error) {
    results.tests.push({
      name: "Write Permission Test",
      status: "ERROR",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }

  // Test 6: Package Notes Table
  try {
    const { data, error } = await supabase.from("package_notes").select("*").limit(1)

    if (error) {
      results.tests.push({
        name: "Package Notes Table",
        status: "FAIL",
        details: `Package notes table access failed: ${error.message}`,
        error: error,
      })
    } else {
      results.tests.push({
        name: "Package Notes Table",
        status: "PASS",
        details: "Package notes table exists and is accessible",
      })
    }
  } catch (error) {
    results.tests.push({
      name: "Package Notes Table",
      status: "ERROR",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }

  // Test 7: Settings Table
  try {
    const { data, error } = await supabase.from("settings").select("*").limit(1)

    if (error) {
      results.tests.push({
        name: "Settings Table",
        status: "FAIL",
        details: `Settings table access failed: ${error.message}`,
        error: error,
      })
    } else {
      results.tests.push({
        name: "Settings Table",
        status: "PASS",
        details: "Settings table exists and is accessible",
      })
    }
  } catch (error) {
    results.tests.push({
      name: "Settings Table",
      status: "ERROR",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }

  return NextResponse.json(results)
}
