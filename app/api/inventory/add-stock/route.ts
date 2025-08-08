import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, canUseSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('Add stock API called')
    
    if (!canUseSupabase()) {
      return NextResponse.json(
        { success: false, error: 'Supabase not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    console.log('Request body:', body)
    
    const { itemId, additionalQuantity, requester, partNumber } = body

    if (!itemId || !additionalQuantity || !requester) {
      console.log('Missing required fields:', { itemId, additionalQuantity, requester })
      return NextResponse.json(
        { success: false, error: 'Missing required fields: itemId, additionalQuantity, requester' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Get the existing item details
    console.log('Fetching item with ID:', itemId)
    const { data: existingItem, error: fetchError } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', itemId)
      .single()

    if (fetchError) {
      console.error('Error fetching item:', fetchError)
      return NextResponse.json(
        { success: false, error: `Item not found: ${fetchError.message}` },
        { status: 404 }
      )
    }

    if (!existingItem) {
      console.log('No item found with ID:', itemId)
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    console.log('Found existing item:', existingItem)

    // Create a pending change for stock addition
    const pendingChangeData = {
      change_type: 'add_stock',
      requested_by: requester,
      status: 'pending',
      item_data: {
        item_id: itemId,
        part_number: existingItem["Part number"] || partNumber,
        part_description: existingItem["Part description"],
        current_quantity: existingItem.QTY,
        additional_quantity: additionalQuantity,
        new_total_quantity: existingItem.QTY + additionalQuantity,
        location: existingItem.Location,
        supplier: existingItem.Supplier,
        package: existingItem.Package
      }
    }

    console.log('Creating pending change:', pendingChangeData)

    const { error: pendingError } = await supabase
      .from('pending_changes')
      .insert(pendingChangeData)

    if (pendingError) {
      console.error('Error creating pending stock addition:', pendingError)
      return NextResponse.json(
        { success: false, error: `Failed to create pending change: ${pendingError.message}` },
        { status: 500 }
      )
    }

    console.log('Successfully created pending change')

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
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
