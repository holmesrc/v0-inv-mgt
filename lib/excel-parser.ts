import * as XLSX from "xlsx"

export function parseExcelFile(file: File): Promise<{ data: any[]; packageNote: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const arrayBuffer = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(arrayBuffer, { type: "array" })

        // Get the first worksheet
        const worksheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[worksheetName]

        // Extract the package note from J1
        const j1Cell = worksheet["J1"]
        const packageNote = j1Cell && j1Cell.v ? j1Cell.v.toString() : ""

        // Get headers from A1-G1
        const expectedColumns = [
          "Part number",
          "MFG Part number",
          "QTY",
          "Part description",
          "Supplier",
          "Location",
          "Package",
        ]

        // Get all data starting from row 2, columns A-G
        const range = worksheet["!ref"]
        if (!range) {
          reject(new Error("Excel file appears to be empty"))
          return
        }

        const decodedRange = XLSX.utils.decode_range(range)
        const rows: any[] = []

        // Start from row 2 (index 1) and only read columns A-G (0-6)
        for (let row = 1; row <= decodedRange.e.r; row++) {
          const rowData: any = {}
          let hasData = false

          for (let col = 0; col < 7; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
            const cell = worksheet[cellAddress]
            const columnName = expectedColumns[col]

            if (cell && cell.v !== undefined && cell.v !== null && cell.v !== "") {
              // Convert QTY to number
              if (columnName === "QTY") {
                rowData[columnName] = Number(cell.v) || 0
              } else {
                rowData[columnName] = cell.v.toString()
              }
              hasData = true
            } else {
              rowData[columnName] = columnName === "QTY" ? 0 : ""
            }
          }

          // Only include rows that have at least some data
          if (hasData) {
            rows.push(rowData)
          }
        }

        if (rows.length === 0) {
          reject(new Error("No data found in the Excel file"))
          return
        }

        resolve({ data: rows, packageNote })
      } catch (error) {
        reject(new Error("Failed to parse Excel file: " + (error as Error).message))
      }
    }

    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsArrayBuffer(file)
  })
}
