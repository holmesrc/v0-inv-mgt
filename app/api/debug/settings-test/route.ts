import { NextResponse } from "next/server"
import { createServerSupabaseClient, canUseSupabase } from "@/lib/supabase"

export async function GET() {
  const logs: string[] = []
  const log = (message: string) => {
    console.log(message)
    logs.push(message)
  }

  try {
    log("=== SETTINGS API TEST START ===")

    // Step 1: Check if Supabase is configured
    log("Step 1: Checking Supabase configuration...")
    if (!canUseSupabase()) {
      log("❌ Supabase not configured")
      return NextResponse.json({
        success: false,
        error: "Supabase is not configured",
        logs,
      })
    }
    log("✅ Supabase is configured")

    // Step 2: Create Supabase client
    log("Step 2: Creating Supabase client...")
    let supabase
    try {
      supabase = createServerSupabaseClient()
      log("✅ Supabase client created")
    } catch (clientError) {
      log(`❌ Error creating Supabase client: ${clientError instanceof Error ? clientError.message : "Unknown error"}`)
      return NextResponse.json({
        success: false,
        error: "Failed to create database connection",
        logs,
      })
    }

    // Step 3: Check if settings table exists
    log("Step 3: Checking if settings table exists...")
    try {
      const { data, error } = await supabase.from("settings").select("count").limit(1)

      if (error) {
        log(`❌ Settings table check failed: ${error.message}`)

        if (error.message.includes("relation") && error.message.includes("does not exist")) {
          log("Settings table does not exist, attempting to create it...")

          try {
            // Try to create the settings table using the function
            const { error: createError } = await supabase.rpc("create_settings_table")

            if (createError) {
              log(`❌ Failed to create settings table: ${createError.message}`)
              return NextResponse.json({
                success: false,
                error: "Settings table does not exist and could not be created",
                logs,
              })
            }

            log("✅ Settings table created successfully")
          } catch (createError) {
            log(
              `❌ Exception creating settings table: ${createError instanceof Error ? createError.message : "Unknown error"}`,
            )

            // Try direct SQL as fallback
            log("Attempting direct SQL creation as fallback...")
            const { error: sqlError } = await supabase.rpc("exec", {
              sql: `
                CREATE TABLE IF NOT EXISTS settings (
                  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                  key TEXT UNIQUE NOT NULL,
                  value JSONB,
                  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
              `,
            })

            if (sqlError) {
              log(`❌ Direct SQL creation failed: ${sqlError.message}`)
              return NextResponse.json({
                success: false,
                error: "Could not create settings table",
                logs,
              })
            }

            log("✅ Settings table created via direct SQL")
          }
        } else {
          return NextResponse.json({
            success: false,
            error: "Error accessing settings table",
            details: error.message,
            logs,
          })
        }
      } else {
        log("✅ Settings table exists")
      }
    } catch (tableError) {
      log(`❌ Exception checking settings table: ${tableError instanceof Error ? tableError.message : "Unknown error"}`)
      return NextResponse.json({
        success: false,
        error: "Failed to check settings table",
        logs,
      })
    }

    // Step 4: Test writing to settings table
    log("Step 4: Testing write to settings table...")
    const testKey = `test_${Date.now()}`
    const testValue = { test: true, timestamp: Date.now() }

    try {
      const { error: writeError } = await supabase
        .from("settings")
        .upsert({ key: testKey, value: testValue, updated_at: new Date().toISOString() })

      if (writeError) {
        log(`❌ Write test failed: ${writeError.message}`)
        return NextResponse.json({
          success: false,
          error: "Failed to write to settings table",
          details: writeError.message,
          logs,
        })
      }
      log("✅ Write test successful")

      // Clean up test data
      const { error: deleteError } = await supabase.from("settings").delete().eq("key", testKey)
      if (deleteError) {
        log(`⚠️ Could not clean up test data: ${deleteError.message}`)
      } else {
        log("✅ Test data cleaned up")
      }
    } catch (writeError) {
      log(`❌ Exception during write test: ${writeError instanceof Error ? writeError.message : "Unknown error"}`)
      return NextResponse.json({
        success: false,
        error: "Exception during write test",
        logs,
      })
    }

    // Step 5: Test reading from settings table
    log("Step 5: Testing read from settings table...")
    try {
      const { data: readData, error: readError } = await supabase.from("settings").select("*").limit(5)

      if (readError) {
        log(`❌ Read test failed: ${readError.message}`)
        return NextResponse.json({
          success: false,
          error: "Failed to read from settings table",
          details: readError.message,
          logs,
        })
      }

      log(`✅ Read test successful, found ${readData.length} settings`)
      log(`Settings data sample: ${JSON.stringify(readData.slice(0, 2))}`)
    } catch (readError) {
      log(`❌ Exception during read test: ${readError instanceof Error ? readError.message : "Unknown error"}`)
      return NextResponse.json({
        success: false,
        error: "Exception during read test",
        logs,
      })
    }

    log("=== SETTINGS API TEST COMPLETE - ALL TESTS PASSED ===")
    return NextResponse.json({
      success: true,
      message: "All settings tests passed",
      logs,
    })
  } catch (error) {
    log(`❌ Critical error: ${error instanceof Error ? error.message : "Unknown error"}`)
    return NextResponse.json({
      success: false,
      error: "Critical error during settings test",
      details: error instanceof Error ? error.message : "Unknown error",
      logs,
    })
  }
}
