import { type NextRequest, NextResponse } from "next/server"
import { generateExcelFile } from "@/lib/excel-generator"

export async function POST(request: NextRequest) {
  try {
    const { inventory, packageNote, filename } = await request.json()

    if (!inventory || !Array.isArray(inventory)) {
      return NextResponse.json({ error: "Invalid inventory data" }, { status: 400 })
    }

    const excelBuffer = generateExcelFile(inventory, packageNote || "")

    // Return the file as a response
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename || "inventory"}_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    })
  } catch (error) {
    console.error("Error generating Excel file:", error)
    return NextResponse.json({ error: "Failed to generate Excel file" }, { status: 500 })
  }
}
