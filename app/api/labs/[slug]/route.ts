import { createServerSupabaseClient } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("labs")
      .select("id, slug, name, config")
      .eq("slug", slug)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 })
    }

    return NextResponse.json({ lab: data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch lab" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from("labs")
      .update({ config: body.config, updated_at: new Date().toISOString() })
      .eq("slug", slug)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ lab: data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update lab" },
      { status: 500 }
    )
  }
}
