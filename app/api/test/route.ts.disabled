import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    message: "API is working!",
    timestamp: new Date().toISOString(),
    routes: {
      test: "/api/test",
      lowStock: "/low-stock",
      slackSend: "/api/slack/send",
    },
  })
}
