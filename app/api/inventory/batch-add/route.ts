import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { batch_items, requester } = await request.json()

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

    // Insert batch record
    const { data: batchData, error: batchError } = await supabase
      .from('pending_changes')
      .insert({
        change_type: 'batch_add',
        requester: requester,
        status: 'pending',
        batch_id: batchId,
        item_data: {
          batch_items: batch_items,
          item_count: batch_items.length
        }
      })
      .select()

    if (batchError) {
      console.error('Error creating batch record:', batchError)
      return NextResponse.json(
        { success: false, error: 'Failed to create batch record' },
        { status: 500 }
      )
    }

    // Insert individual items as part of the batch
    const pendingItems = batch_items.map((item: any) => ({
      change_type: 'batch_item_add',
      requester: requester,
      status: 'pending',
      batch_id: batchId,
      item_data: {
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

    const { error: itemsError } = await supabase
      .from('pending_changes')
      .insert(pendingItems)

    if (itemsError) {
      console.error('Error creating batch items:', itemsError)
      return NextResponse.json(
        { success: false, error: 'Failed to create batch items' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Batch of ${batch_items.length} items submitted for approval`,
      batch_id: batchId
    })

  } catch (error) {
    console.error('Batch add error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
