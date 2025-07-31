// Simple parser for the preview environment - no external dependencies
export function parseExcelFile(file: File): Promise<{ data: any[]; packageNote: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string

        // Simple CSV parsing for preview environment
        if (file.name.toLowerCase().endsWith(".csv")) {
          const lines = text.split("\n").filter((line) => line.trim())
          if (lines.length < 2) {
            reject(new Error("CSV file must have at least a header row and one data row"))
            return
          }

          const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
          const expectedColumns = [
            "Part number",
            "MFG Part number",
            "QTY",
            "Part description",
            "Supplier",
            "Location",
            "Package",
          ]

          const data = []
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""))
            if (values.length >= 7) {
              const row: any = {}
              expectedColumns.forEach((col, index) => {
                if (col === "QTY") {
                  row[col] = Number(values[index]) || 0
                } else {
                  row[col] = values[index] || ""
                }
              })
              data.push(row)
            }
          }

          resolve({ data, packageNote: "Parsed from CSV file" })
        } else {
          // For Excel files in preview, show helpful message
          reject(
            new Error(
              "Excel file processing requires the deployed environment. Please use CSV format or sample data for testing.",
            ),
          )
        }
      } catch (error) {
        reject(new Error("Failed to parse file: " + (error as Error).message))
      }
    }

    reader.onerror = () => reject(new Error("Failed to read file"))

    // Read as text for CSV, show error for Excel
    if (file.name.toLowerCase().endsWith(".csv")) {
      reader.readAsText(file)
    } else {
      reject(
        new Error(
          "In preview environment, please use CSV files or sample data. Excel files work in the deployed version.",
        ),
      )
    }
  })
}
