import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const labId = searchParams.get('labId')

    let query = supabase
      .from('supplier_integration_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (labId) {
      query = query.eq('lab_id', labId)
    }

    const { data, error } = await query

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, requests: [] })
      }
      throw error
    }

    return NextResponse.json({ success: true, requests: data || [] })
  } catch (error) {
    console.error('Error fetching integration requests:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch requests' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supplierName, supplierWebsite, apiDocsUrl, requester, notes, labId } = body

    if (!supplierName?.trim() || !requester?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Supplier name and requester are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('supplier_integration_requests')
      .insert({
        supplier_name: supplierName.trim(),
        supplier_website: supplierWebsite?.trim() || null,
        api_docs_url: apiDocsUrl?.trim() || null,
        requester: requester.trim(),
        notes: notes?.trim() || null,
        lab_id: labId || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      // If table doesn't exist, return a helpful message
      if (error.code === '42P01') {
        return NextResponse.json(
          { success: false, error: 'Database table not set up yet. Run the migration first.' },
          { status: 500 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, request: data })
  } catch (error) {
    console.error('Error creating integration request:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create request' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, adminNotes } = body

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'Request ID and status are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('supplier_integration_requests')
      .update({
        status,
        admin_notes: adminNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, request: data })
  } catch (error) {
    console.error('Error updating integration request:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update request' },
      { status: 500 }
    )
  }
}
