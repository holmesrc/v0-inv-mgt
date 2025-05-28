import * as XLSX from "xlsx"
import type { InventoryItem } from "@/types/inventory"

export function generateExcelFile(inventory: InventoryItem[], packageNote = ""): ArrayBuffer {
  // Create a new workbook
  const workbook = XLSX.utils.book_new()

  // Prepare data for Excel (convert back to original column names)
  const excelData = inventory.map((item) => ({
    "Part number": item["Part number"],
    "MFG Part number": item["MFG Part number"],
    QTY: item["QTY"],
    "Part description": item["Part description"],
    Supplier: item["Supplier"],
    Location: item["Location"],
    Package: item["Package"],
  }))

  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(excelData)

  // Add the package note to cell J1 if provided
  if (packageNote) {
    worksheet["J1"] = { v: packageNote, t: "s" }
  }

  // Set column widths for better readability
  const columnWidths = [
    { wch: 15 }, // Part number
    { wch: 20 }, // MFG Part number
    { wch: 8 }, // QTY
    { wch: 30 }, // Part description
    { wch: 15 }, // Supplier
    { wch: 12 }, // Location
    { wch: 12 }, // Package
    { wch: 5 }, // H (empty)
    { wch: 5 }, // I (empty)
    { wch: 25 }, // J (package note)
  ]
  worksheet["!cols"] = columnWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory")

  // Generate buffer
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  return excelBuffer
}

export function downloadExcelFile(inventory: InventoryItem[], packageNote = "", filename = "inventory") {
  const excelBuffer = generateExcelFile(inventory, packageNote)

  // Create blob and download
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = window.URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  window.URL.revokeObjectURL(url)
}
