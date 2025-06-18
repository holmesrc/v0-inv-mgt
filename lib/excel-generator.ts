import type { InventoryItem } from "@/types/inventory"

// Simple CSV generation for preview environment
export function generateExcelFile(inventory: InventoryItem[], packageNote = ""): ArrayBuffer {
  // Create CSV content
  const headers = ["Part number", "MFG Part number", "QTY", "Part description", "Supplier", "Location", "Package"]
  const csvContent = [
    headers.join(","),
    ...inventory.map((item) =>
      [
        `"${item["Part number"]}"`,
        `"${item["MFG Part number"]}"`,
        item["QTY"],
        `"${item["Part description"]}"`,
        `"${item["Supplier"]}"`,
        `"${item["Location"]}"`,
        `"${item["Package"]}"`,
      ].join(","),
    ),
  ].join("\n")

  // Add package note as comment
  const finalContent = packageNote ? `# Package Note: ${packageNote}\n${csvContent}` : csvContent

  // Convert to ArrayBuffer
  const encoder = new TextEncoder()
  return encoder.encode(finalContent).buffer
}

export function downloadExcelFile(inventory: any[], packageNote: string, filename = "inventory") {
  try {
    // Create CSV content
    const headers = ["Part number", "MFG Part number", "QTY", "Part description", "Supplier", "Location", "Package"]
    const csvContent = [
      headers.join(","),
      ...inventory.map((item) =>
        [
          `"${item["Part number"] || ""}"`,
          `"${item["MFG Part number"] || ""}"`,
          item["QTY"] || 0,
          `"${item["Part description"] || ""}"`,
          `"${item["Supplier"] || ""}"`,
          `"${item["Location"] || ""}"`,
          `"${item["Package"] || ""}"`,
        ].join(","),
      ),
    ].join("\n")

    // Add package note as comment
    const finalContent = packageNote ? `# Package Note: ${packageNote}\n${csvContent}` : csvContent

    // Create and download CSV file
    const blob = new Blob([finalContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${filename}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    console.log(`✅ CSV file "${filename}.csv" downloaded successfully`)
  } catch (error) {
    console.error("❌ Error generating CSV file:", error)
    alert("Failed to generate CSV file. Please try again.")
  }
}

export function generateExcelBuffer(inventory: any[], packageNote: string): ArrayBuffer {
  try {
    // Create CSV content
    const headers = ["Part number", "MFG Part number", "QTY", "Part description", "Supplier", "Location", "Package"]
    const csvContent = [
      headers.join(","),
      ...inventory.map((item) =>
        [
          `"${item["Part number"] || ""}"`,
          `"${item["MFG Part number"] || ""}"`,
          item["QTY"] || 0,
          `"${item["Part description"] || ""}"`,
          `"${item["Supplier"] || ""}"`,
          `"${item["Location"] || ""}"`,
          `"${item["Package"] || ""}"`,
        ].join(","),
      ),
    ].join("\n")

    // Add package note as comment
    const finalContent = packageNote ? `# Package Note: ${packageNote}\n${csvContent}` : csvContent

    // Convert to ArrayBuffer
    const encoder = new TextEncoder()
    return encoder.encode(finalContent).buffer
  } catch (error) {
    console.error("❌ Error generating CSV buffer:", error)
    throw new Error("Failed to generate CSV buffer")
  }
}
