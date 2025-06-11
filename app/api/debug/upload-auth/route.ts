import { NextResponse } from "next/server"

export async function GET() {
  const uploadPassword = process.env.UPLOAD_PASSWORD

  return NextResponse.json({
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    uploadPassword: {
      exists: !!uploadPassword,
      length: uploadPassword?.length || 0,
      value: uploadPassword, // Show the actual value for debugging
      type: typeof uploadPassword,
      hasWhitespace: uploadPassword ? /\s/.test(uploadPassword) : false,
      startsWithSpace: uploadPassword ? uploadPassword.startsWith(" ") : false,
      endsWithSpace: uploadPassword ? uploadPassword.endsWith(" ") : false,
    },
    testValues: {
      direct: "PHL10HWLab",
      withSpaces: " PHL10HWLab ",
      comparison: uploadPassword === "PHL10HWLab",
    },
  })
}
