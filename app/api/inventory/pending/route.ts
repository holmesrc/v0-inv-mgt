import { type NextRequest, NextResponse } from "next/server"

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET() {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ success: false, error: "Database not configured", data: [] }, { status: 500 })
    }

    const url = `${SUPABASE_URL}/rest/v1/pending_changes?select=*&order=created_at.desc`
    const resp = await fetch(url, {
      headers: {
        apikey: SERVICE_KEY,
        authorization: `Bearer ${SERVICE_KEY}`,
      },
      cache: "no-store",
    })

    if (!resp.ok) {
      const text = await resp.text()
      return NextResponse.json({ success: false, error: `Supabase error: ${text}`, data: [] }, { status: resp.status })
    }

    const data = (await resp.json()) as unknown[]
    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error("GET /api/inventory/pending", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error", data: [] },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 })
    }

    const { changeType, itemData, originalData, requestedBy } = await request.json()

    if (!changeType || !requestedBy) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: changeType, requestedBy" },
        { status: 400 },
      )
    }

    const payload = [
      {
        change_type: changeType,
        item_data: itemData,
        original_data: originalData,
        requested_by: requestedBy,
        status: "pending",
      },
    ]

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/pending_changes`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    })

    if (!resp.ok) {
      const text = await resp.text()
      return NextResponse.json({ success: false, error: `Supabase error: ${text}` }, { status: resp.status })
    }

    const [data] = (await resp.json()) as unknown[]
    return NextResponse.json({ success: true, data, message: "Change submitted for approval" })
  } catch (err) {
    console.error("POST /api/inventory/pending", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
