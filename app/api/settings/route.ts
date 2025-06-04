import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function GET() {
  try {
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { key, value } = await request.json()
    const supabase = createServerSupabaseClient()

    const { error } = await supabase.from("settings").upsert({ key, value, updated_at: new Date().toISOString() })

    if (error) {
      console.error("Error saving settings:", error)
      return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Settings saved successfully" })
  } catch (error) {
    console.error("Error saving settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
