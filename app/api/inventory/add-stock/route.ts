import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { itemId, additionalQuantity, requester, partNumber } = await request.json()

    if (!itemId || !additionalQuantity || !requester || !partNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the existing item details
    const { data: existingItem, error: fetchError } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', itemId)
      .single()

    if (fetchError || !existingItem) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    // Create a pending change for stock addition
    const { error: pendingError } = await supabase
      .from('pending_changes')
      .insert({
        change_type: 'add_stock',
        requester: requester,
        status: 'pending',
        item_data: {
          item_id: itemId,
          part_number: partNumber,
          current_quantity: existingItem.QTY,
          additional_quantity: additionalQuantity,
          new_total_quantity: existingItem.QTY + additionalQuantity,
          existing_item: existingItem
        }
      })

    if (pendingError) {
      console.error('Error creating pending stock addition:', pendingError)
      return NextResponse.json(
        { success: false, error: 'Failed to create pending change' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Stock addition of ${additionalQuantity} units submitted for approval`,
      current_quantity: existingItem.QTY,
      additional_quantity: additionalQuantity,
      new_total: existingItem.QTY + additionalQuantity
    })

  } catch (error) {
    console.error('Add stock error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
