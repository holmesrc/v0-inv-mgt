import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authCookie = request.cookies.get("approval-auth")
    const accessLevel = request.cookies.get("approval-access-level")?.value || "lab"

    if (authCookie?.value === "authenticated") {
      return NextResponse.json({ authenticated: true, accessLevel })
    } else {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
