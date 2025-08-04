import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { pendingId, additionalQuantity, requester, partNumber } = await request.json()

    if (!pendingId || !additionalQuantity || !requester || !partNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the existing pending item details
    const { data: existingPendingItem, error: fetchError } = await supabase
      .from('pending_changes')
      .select('*')
      .eq('id', pendingId)
      .single()

    if (fetchError || !existingPendingItem) {
      return NextResponse.json(
        { success: false, error: 'Pending item not found' },
        { status: 404 }
      )
    }

    const currentQuantity = existingPendingItem.item_data?.quantity || existingPendingItem.item_data?.QTY || 0

    // Create a pending change for stock addition to pending item
    const { error: pendingError } = await supabase
      .from('pending_changes')
      .insert({
        change_type: 'add_stock_to_pending',
        requester: requester,
        status: 'pending',
        item_data: {
          pending_item_id: pendingId,
          part_number: partNumber,
          current_quantity: currentQuantity,
          additional_quantity: additionalQuantity,
          new_total_quantity: currentQuantity + additionalQuantity,
          existing_pending_item: existingPendingItem
        }
      })

    if (pendingError) {
      console.error('Error creating pending stock addition to pending item:', pendingError)
      return NextResponse.json(
        { success: false, error: 'Failed to create pending change' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Stock addition of ${additionalQuantity} units to pending item submitted for approval`,
      current_quantity: currentQuantity,
      additional_quantity: additionalQuantity,
      new_total: currentQuantity + additionalQuantity
    })

  } catch (error) {
    console.error('Add stock to pending error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
