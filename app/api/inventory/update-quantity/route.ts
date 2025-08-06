import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { itemId, newQuantity, requester } = await request.json()

    if (!itemId || newQuantity === undefined || !requester) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (newQuantity < 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity cannot be negative' },
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

    // Create a pending change for quantity update
    const { error: pendingError } = await supabase
      .from('pending_changes')
      .insert({
        change_type: 'update_quantity',
        requester: requester,
        status: 'pending',
        item_data: {
          item_id: itemId,
          part_number: existingItem['Part number'],
          part_description: existingItem['Part description'],
          current_quantity: existingItem.QTY,
          new_quantity: newQuantity,
          quantity_change: newQuantity - existingItem.QTY,
          location: existingItem.Location,
          existing_item: existingItem
        }
      })

    if (pendingError) {
      console.error('Error creating pending quantity update:', pendingError)
      return NextResponse.json(
        { success: false, error: 'Failed to create pending change' },
        { status: 500 }
      )
    }

    const quantityChange = newQuantity - existingItem.QTY
    const changeDescription = quantityChange > 0 
      ? `increase of ${quantityChange} units` 
      : `decrease of ${Math.abs(quantityChange)} units`

    return NextResponse.json({
      success: true,
      message: `Quantity ${changeDescription} submitted for approval`,
      current_quantity: existingItem.QTY,
      new_quantity: newQuantity,
      quantity_change: quantityChange
    })

  } catch (error) {
    console.error('Update quantity error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
