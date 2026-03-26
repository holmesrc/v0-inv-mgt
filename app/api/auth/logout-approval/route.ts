import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const lab = request.nextUrl.searchParams.get("lab") || "global"
  const response = NextResponse.json({ success: true })
  response.cookies.set(`approval-auth-${lab}`, "", { maxAge: 0 })
  return response
}
