import { NextResponse } from "next/server"
import { createServerSupabaseClient, canUseSupabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Check if Supabase is configured
    const isConfigured = canUseSupabase()

    if (!isConfigured) {
      return NextResponse.json({
        status: "error",
        message: "Supabase is not configured",
        env: {
          supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      })
    }

    // Try to create a Supabase client
    try {
      const supabase = createServerSupabaseClient()

      // Test bucket access
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

      // Test bucket creation
      let bucketExists = false
      let bucketContents = null
      let bucketError = null

      if (buckets) {
        bucketExists = buckets.some((bucket) => bucket.name === "inventory-files")

        // Try to list files in the bucket
        if (bucketExists) {
          const { data: files, error: filesError } = await supabase.storage.from("inventory-files").list()
          bucketContents = files
          bucketError = filesError
        }
      }

      return NextResponse.json({
        status: "success",
        message: "Supabase connection successful",
        buckets: {
          list: buckets,
          error: bucketsError,
        },
        inventoryFilesBucket: {
          exists: bucketExists,
          contents: bucketContents,
          error: bucketError,
        },
      })
    } catch (error) {
      return NextResponse.json({
        status: "error",
        message: "Failed to create Supabase client",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: "Unhandled error in debug endpoint",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
