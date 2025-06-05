import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { list } from "@vercel/blob"

export async function GET() {
  try {
    // First try to get from settings in database
    const supabase = createServerSupabaseClient()
    const { data: settings } = await supabase.from("settings").select("*").eq("key", "current_excel_file").single()

    if (settings?.value?.url) {
      return NextResponse.json({
        success: true,
        url: settings.value.url,
        filename: settings.value.filename,
        uploadedAt: settings.value.uploadedAt,
        source: "database",
      })
    }

    // If not in database, check blob storage directly
    const { blobs } = await list({ prefix: "inventory-excel/" })

    if (blobs.length > 0) {
      // Sort by uploaded time (newest first)
      const sortedBlobs = blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

      const latestBlob = sortedBlobs[0]

      // Store in database for future reference
      await supabase.from("settings").upsert({
        key: "current_excel_file",
        value: {
          url: latestBlob.url,
          filename: latestBlob.pathname.split("/").pop(),
          uploadedAt: latestBlob.uploadedAt,
        },
        updated_at: new Date().toISOString(),
      })

      return NextResponse.json({
        success: true,
        url: latestBlob.url,
        filename: latestBlob.pathname.split("/").pop(),
        uploadedAt: latestBlob.uploadedAt,
        source: "blob_storage",
      })
    }

    return NextResponse.json({
      success: false,
      message: "No Excel file found",
    })
  } catch (error) {
    console.error("Error getting current Excel file:", error)
    return NextResponse.json({ error: "Failed to get current Excel file" }, { status: 500 })
  }
}
