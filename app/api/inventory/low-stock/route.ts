import { type NextRequest, NextResponse } from "next/server"

// This is a mock endpoint since we don't have persistent storage
// In a real app, this would fetch from your database
export async function GET(request: NextRequest) {
  try {
    // Since we don't have persistent storage in this demo,
    // we'll return a mock response
    // In a real application, you would fetch this from your database

    const mockLowStockItems = [
      {
        partNumber: "490-12158-ND",
        description: "CAP KIT CERAMIC 0.1PF-5PF 1000PC",
        supplier: "Digi-Key",
        location: "A1-B2",
        currentStock: 5,
        reorderPoint: 10,
      },
      {
        partNumber: "311-1.00KCRCT-ND",
        description: "RES 1.00K OHM 1/4W 1% AXIAL",
        supplier: "Digi-Key",
        location: "C3-D4",
        currentStock: 3,
        reorderPoint: 15,
      },
      {
        partNumber: "296-8502-1-ND",
        description: "IC MCU 8BIT 32KB FLASH 28DIP",
        supplier: "Microchip",
        location: "E5-F6",
        currentStock: 2,
        reorderPoint: 8,
      },
    ]

    return NextResponse.json({
      success: true,
      items: mockLowStockItems,
      count: mockLowStockItems.length,
    })
  } catch (error) {
    console.error("Error fetching low stock items:", error)
    return NextResponse.json({ error: "Failed to fetch low stock items" }, { status: 500 })
  }
}
