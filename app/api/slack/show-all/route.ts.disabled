import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Simply redirect to the low stock page
  return NextResponse.redirect(new URL("/low-stock", request.url))
}
