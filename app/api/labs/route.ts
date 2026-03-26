import { createServerSupabaseClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("labs")
      .select("id, slug, name, config")
      .order("name")

    if (error) throw error

    return NextResponse.json({ labs: data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch labs" },
      { status: 500 }
    )
  }
}
