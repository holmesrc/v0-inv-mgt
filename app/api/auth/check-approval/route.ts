import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const labSlug = request.nextUrl.searchParams.get("lab") || "global"
    const cookieName = `approval-auth-${labSlug}`
    const authCookie = request.cookies.get(cookieName)

    if (authCookie?.value) {
      return NextResponse.json({ authenticated: true, accessLevel: authCookie.value })
    } else {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
