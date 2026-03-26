import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

const MASTER_PASSWORD = process.env.MASTER_PASSWORD || "MASTER2026"
const FALLBACK_PASSWORD = process.env.UPLOAD_PASSWORD || "PHL10"

export async function POST(request: NextRequest) {
  try {
    const { password, type, labSlug } = await request.json()

    let authenticated = false
    let accessLevel: "master" | "lab" = "lab"

    // Master password
    if (password === MASTER_PASSWORD) {
      authenticated = true
      accessLevel = "master"
    }

    // Try lab-specific password
    if (!authenticated && labSlug) {
      try {
        const supabase = createServerSupabaseClient()
        const { data: lab } = await supabase
          .from("labs")
          .select("config")
          .eq("slug", labSlug)
          .single()

        const labPassword = lab?.config?.password
        if (labPassword && password === labPassword) {
          authenticated = true
          accessLevel = "lab"
        }
      } catch {
        // Fall through to fallback
      }
    }

    // Fallback password (only for PA backwards compat)
    if (!authenticated && labSlug === "pa" && password === FALLBACK_PASSWORD) {
      authenticated = true
      accessLevel = "lab"
    }

    if (authenticated) {
      const response = NextResponse.json({ success: true, accessLevel })
      if (type === "approval") {
        // Lab-specific cookie name so each lab requires its own login
        const cookieName = `approval-auth-${labSlug || "global"}`
        response.cookies.set(cookieName, accessLevel, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 10, // 10 minutes
        })
      } else {
        response.cookies.set("upload-auth", "authenticated", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24,
        })
      }
      return response
    } else {
      return NextResponse.json({ success: false, error: "Invalid password" }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }
}
