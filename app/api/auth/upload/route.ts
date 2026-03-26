import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

const MASTER_PASSWORD = process.env.MASTER_PASSWORD || "MASTER2026"
const FALLBACK_PASSWORD = process.env.UPLOAD_PASSWORD || "PHL10"

export async function POST(request: NextRequest) {
  try {
    const { password, type, labSlug } = await request.json()

    // Master password always works
    let authenticated = password === MASTER_PASSWORD

    // Try lab-specific password if not master
    if (!authenticated && labSlug) {
      try {
        const supabase = createServerSupabaseClient()
        const { data: lab } = await supabase
          .from("labs")
          .select("config")
          .eq("slug", labSlug)
          .single()

        const labPassword = lab?.config?.password
        if (labPassword) {
          authenticated = password === labPassword
        }
      } catch {
        // Fall through to fallback
      }
    }

    // Fallback to env var password
    if (!authenticated) {
      authenticated = password === FALLBACK_PASSWORD
    }

    if (authenticated) {
      const response = NextResponse.json({ success: true })
      const cookieName = type === "approval" ? "approval-auth" : "upload-auth"
      response.cookies.set(cookieName, "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
      })
      return response
    } else {
      return NextResponse.json({ success: false, error: "Invalid password" }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }
}
