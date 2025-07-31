import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("=== UPLOAD TEST START ===")

    // Test 1: Can we get the form data?
    const formData = await request.formData()
    const file = formData.get("file") as File

    console.log("File received:", {
      name: file?.name,
      size: file?.size,
      type: file?.type,
    })

    if (!file) {
      return NextResponse.json({ error: "No file provided", step: "file-check" }, { status: 400 })
    }

    // Test 2: Can we read the file?
    const arrayBuffer = await file.arrayBuffer()
    console.log("File read successfully, size:", arrayBuffer.byteLength)

    // Test 3: Check environment variables
    const envCheck = {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
    console.log("Environment check:", envCheck)

    // Test 4: Try to import Supabase (this might be where it fails)
    try {
      const { createClient } = await import("@supabase/supabase-js")
      console.log("Supabase import successful")

      // Test 5: Try to create client
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
        console.log("Supabase client created successfully")

        // Test 6: Try a simple query
        const { data, error } = await supabase.from("inventory").select("count").limit(1)
        console.log("Database test:", { data, error })

        return NextResponse.json({
          success: true,
          message: "All tests passed!",
          fileSize: arrayBuffer.byteLength,
          envCheck,
          dbTest: { data, error },
        })
      } else {
        return NextResponse.json(
          {
            error: "Missing Supabase environment variables",
            envCheck,
          },
          { status: 500 },
        )
      }
    } catch (supabaseError) {
      console.error("Supabase error:", supabaseError)
      return NextResponse.json(
        {
          error: "Supabase connection failed",
          details: supabaseError instanceof Error ? supabaseError.message : "Unknown error",
          envCheck,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("=== UPLOAD TEST ERROR ===", error)
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
