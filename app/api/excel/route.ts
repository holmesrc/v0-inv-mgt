import { type NextRequest, NextResponse } from "next/server"
import {
  uploadExcelFile,
  readInventoryFromExcel,
  getExcelFileMetadata,
  excelFileExists,
  isStorageAvailable,
} from "@/lib/storage"

// Get Excel file status and metadata
export async function GET() {
  try {
    if (!isStorageAvailable()) {
      return NextResponse.json({
        exists: false,
        configured: false,
        message: "Supabase storage is not configured. Please set up your environment variables.",
      })
    }

    const exists = await excelFileExists()

    if (!exists) {
      return NextResponse.json({
        exists: false,
        configured: true,
        message: "No Excel file has been uploaded",
      })
    }

    const metadata = await getExcelFileMetadata()

    return NextResponse.json({
      exists: true,
      configured: true,
      metadata,
      message: "Excel file exists in storage",
    })
  } catch (error) {
    console.error("Error checking Excel file status:", error)
    return NextResponse.json(
      {
        error: "Failed to check Excel file status",
        configured: false,
      },
      { status: 500 },
    )
  }
}

// Upload a new Excel file
export async function POST(request: NextRequest) {
  try {
    if (!isStorageAvailable()) {
      return NextResponse.json(
        {
          error: "Supabase storage is not configured. Please set up your environment variables.",
          configured: false,
        },
        { status: 503 },
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json(
        { error: "Invalid file type. Only Excel files (.xlsx, .xls) are allowed." },
        { status: 400 },
      )
    }

    // Upload the file
    const result = await uploadExcelFile(file)

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    // Read the inventory data from the uploaded file
    const inventoryData = await readInventoryFromExcel()

    return NextResponse.json({
      success: true,
      message: "Excel file uploaded successfully",
      inventoryCount: inventoryData.inventory.length,
      packageNote: inventoryData.packageNote,
    })
  } catch (error) {
    console.error("Error uploading Excel file:", error)
    return NextResponse.json({ error: "Failed to upload Excel file" }, { status: 500 })
  }
}

// Read inventory data from the stored Excel file
export async function PUT() {
  try {
    if (!isStorageAvailable()) {
      return NextResponse.json(
        {
          error: "Supabase storage is not configured",
          configured: false,
        },
        { status: 503 },
      )
    }

    const result = await readInventoryFromExcel()

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      inventory: result.inventory,
      packageNote: result.packageNote,
      count: result.inventory.length,
    })
  } catch (error) {
    console.error("Error reading inventory from Excel:", error)
    return NextResponse.json({ error: "Failed to read inventory from Excel file" }, { status: 500 })
  }
}
