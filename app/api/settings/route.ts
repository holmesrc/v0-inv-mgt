import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, canUseSupabase } from "@/lib/supabase"

export async function GET() {
  try {
    if (!canUseSupabase()) {
      return NextResponse.json({
        error: "Supabase is not configured. Using default settings.",
        configured: false,
        data: {
          alert_settings: {
            enabled: true,
            dayOfWeek: 1,
            time: "09:00",
            defaultReorderPoint: 10,
          },
        },
      })
    }

    const supabase = createServerSupabaseClient()

    const { data: settings, error } = await supabase.from("settings").select("*")

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
    }

    // Convert to key-value object
    const settingsObj = settings.reduce((acc: any, setting: any) => {
      acc[setting.key] = setting.value
      return acc
    }, {})

    return NextResponse.json({ success: true, data: settingsObj })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json(
      {
        error: "Supabase configuration error",
        configured: false,
      },
      { status: 503 },
    )
  }
}

export async function POST(request: NextRequest) {
  console.log("=== SETTINGS API DEBUG START ===")

  try {
    if (!canUseSupabase()) {
      return NextResponse.json(
        {
          error: "Supabase is not configured. Settings will be stored locally only.",
          configured: false,
        },
        { status: 503 },
      )
    }

    // Parse request body with detailed error handling
    let requestBody
    try {
      requestBody = await request.json()
      console.log("Request body parsed successfully:", requestBody)
    } catch (parseError) {
      console.error("Error parsing request body:", parseError)
      return NextResponse.json(
        {
          error: "Invalid request format",
          details: parseError instanceof Error ? parseError.message : "Unknown parsing error",
        },
        { status: 400 },
      )
    }

    const { key, value } = requestBody

    if (!key) {
      console.error("Missing key in request")
      return NextResponse.json({ error: "Missing key parameter" }, { status: 400 })
    }

    console.log(`Saving settings for key: ${key}`)

    const supabase = createServerSupabaseClient()

    // First check if the settings table exists
    try {
      const { error: tableCheckError } = await supabase.from("settings").select("count").limit(1)

      if (tableCheckError) {
        console.error("Settings table check failed:", tableCheckError)

        if (tableCheckError.message.includes("relation") && tableCheckError.message.includes("does not exist")) {
          console.log("Settings table does not exist, creating it...")

          // Create the settings table
          const { error: createTableError } = await supabase.rpc("create_settings_table")

          if (createTableError) {
            console.error("Failed to create settings table:", createTableError)
            return NextResponse.json(
              {
                error: "Settings table does not exist and could not be created",
                details: createTableError.message,
              },
              { status: 500 },
            )
          }

          console.log("Settings table created successfully")
        } else {
          return NextResponse.json(
            {
              error: "Error accessing settings table",
              details: tableCheckError.message,
            },
            { status: 500 },
          )
        }
      }
    } catch (tableError) {
      console.error("Error checking settings table:", tableError)
      return NextResponse.json(
        {
          error: "Failed to check settings table",
          details: tableError instanceof Error ? tableError.message : "Unknown table error",
        },
        { status: 500 },
      )
    }

    // Now try to upsert the settings
    try {
      // First check if the setting already exists
      const { data: existingSettings, error: checkError } = await supabase
        .from("settings")
        .select("*")
        .eq("key", key)
        .maybeSingle()

      if (checkError) {
        console.error("Error checking existing settings:", checkError)
        return NextResponse.json(
          {
            error: "Failed to check existing settings",
            details: checkError.message,
          },
          { status: 500 },
        )
      }

      let result

      if (existingSettings) {
        // Update existing setting
        console.log(`Setting ${key} exists, updating...`)
        result = await supabase
          .from("settings")
          .update({
            value,
            updated_at: new Date().toISOString(),
          })
          .eq("key", key)
      } else {
        // Insert new setting
        console.log(`Setting ${key} doesn't exist, inserting...`)
        result = await supabase.from("settings").insert({
          key,
          value,
          updated_at: new Date().toISOString(),
        })
      }

      if (result.error) {
        console.error("Error saving settings:", result.error)
        return NextResponse.json(
          {
            error: "Failed to save settings",
            details: result.error.message,
            code: result.error.code,
          },
          { status: 500 },
        )
      }

      console.log("Settings saved successfully")
      return NextResponse.json({ success: true, message: "Settings saved successfully" })
    } catch (upsertError) {
      console.error("Exception during settings upsert:", upsertError)
      return NextResponse.json(
        {
          error: "Exception during settings save",
          details: upsertError instanceof Error ? upsertError.message : "Unknown upsert error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Critical error in settings API:", error)
    return NextResponse.json(
      {
        error: "Critical error in settings API",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
