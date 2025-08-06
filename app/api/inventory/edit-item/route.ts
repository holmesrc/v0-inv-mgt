import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { itemId, changes, requester } = await request.json()

    console.log('Edit item request:', { itemId, changes, requester })

    if (!itemId || !changes || !requester) {
      console.log('Missing required fields:', { itemId: !!itemId, changes: !!changes, requester: !!requester })
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate quantity if provided
    if (changes.quantity !== undefined) {
      const quantity = parseInt(changes.quantity)
      if (isNaN(quantity) || quantity < 0) {
        console.log('Invalid quantity:', changes.quantity)
        return NextResponse.json(
          { success: false, error: 'Quantity must be a valid non-negative number' },
          { status: 400 }
        )
      }
    }

    // Validate reorder point if provided
    if (changes.reorderPoint !== undefined) {
      const reorderPoint = parseInt(changes.reorderPoint)
      if (isNaN(reorderPoint) || reorderPoint < 0) {
        console.log('Invalid reorder point:', changes.reorderPoint)
        return NextResponse.json(
          { success: false, error: 'Reorder point must be a valid non-negative number' },
          { status: 400 }
        )
      }
    }

    console.log('Fetching existing item with ID:', itemId)

    // Get the existing item details
    const { data: existingItem, error: fetchError } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', itemId)
      .single()

    if (fetchError) {
      console.error('Error fetching existing item:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch item: ' + fetchError.message },
        { status: 500 }
      )
    }

    if (!existingItem) {
      console.log('Item not found for ID:', itemId)
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    console.log('Existing item found:', existingItem)

    const pendingChangeData = {
      change_type: 'edit_item',
      requester: requester,
      status: 'pending',
      item_data: {
        item_id: itemId,
        part_number: existingItem['Part number'],
        part_description: existingItem['Part description'],
        existing_item: existingItem,
        proposed_changes: {
          part_number: changes.partNumber,
          mfg_part_number: changes.mfgPartNumber,
          part_description: changes.description,
          quantity: changes.quantity ? parseInt(changes.quantity) : existingItem.QTY,
          location: changes.location,
          supplier: changes.supplier,
          package: changes.package,
          reorder_point: changes.reorderPoint ? parseInt(changes.reorderPoint) : existingItem.reorderPoint
        }
      }
    }

    console.log('Attempting to insert pending change:', pendingChangeData)

    // Create a pending change for item edit
    const { error: pendingError } = await supabase
      .from('pending_changes')
      .insert(pendingChangeData)

    if (pendingError) {
      console.error('Error creating pending item edit:', pendingError)
      return NextResponse.json(
        { success: false, error: 'Failed to create pending change: ' + pendingError.message },
        { status: 500 }
      )
    }

    console.log('Pending change created successfully')

    return NextResponse.json({
      success: true,
      message: 'Item changes submitted for approval',
      item_id: itemId,
      changes: changes
    })

  } catch (error) {
    console.error('Edit item error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
