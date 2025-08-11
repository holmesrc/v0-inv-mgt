import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    console.log('Batch add API called')
    const { batch_items, requester } = await request.json()
    console.log('Request data:', { batch_items_count: batch_items?.length, requester })

    if (!batch_items || !Array.isArray(batch_items) || batch_items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No batch items provided' },
        { status: 400 }
      )
    }

    if (!requester) {
      return NextResponse.json(
        { success: false, error: 'Requester is required' },
        { status: 400 }
      )
    }

    // Generate a unique batch ID
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log('Generated batch ID:', batchId)

    // Insert individual items directly (no batch record needed)
    const pendingItems = batch_items.map((item: any) => ({
      change_type: 'add',
      requested_by: requester,
      status: 'pending',
      item_data: {
        batch_id: batchId,
        part_number: item.part_number,
        mfg_part_number: item.mfg_part_number,
        part_description: item.part_description,
        quantity: item.quantity,
        location: item.location,
        supplier: item.supplier,
        package: item.package,
        reorder_point: item.reorder_point
      }
    }))

    console.log('Inserting pending items:', pendingItems.length)
    const { error: itemsError } = await supabase
      .from('pending_changes')
      .insert(pendingItems)

    if (itemsError) {
      console.error('Error creating batch items:', itemsError)
      return NextResponse.json(
        { success: false, error: `Failed to create batch items: ${itemsError.message}` },
        { status: 500 }
      )
    }

    console.log('Batch submission successful')
    return NextResponse.json({
      success: true,
      message: `Batch of ${batch_items.length} items submitted for approval`,
      batch_id: batchId
    })

  } catch (error) {
    console.error('Batch add error:', error)
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
