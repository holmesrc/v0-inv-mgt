import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Upload to blob storage
    const { url } = await put(`inventory-excel/${Date.now()}-${file.name}`, file, {
      access: "public",
    })

    // Store the current Excel file URL in the database (for shared access)
    const response = await fetch(new URL("/api/settings", request.url).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "current_excel_file",
        value: { url, filename: file.name, uploadedAt: new Date().toISOString() },
      }),
    })

    if (!response.ok) {
      console.warn("Failed to store Excel URL in settings, but file was uploaded successfully")
    }

    return NextResponse.json({ success: true, url })
  } catch (error) {
    console.error("Error uploading file to blob storage:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}
