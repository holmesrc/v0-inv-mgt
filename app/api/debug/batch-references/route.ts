import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET() {
  try {
    const searchDir = path.join(process.cwd(), "app")
    const batchReferences: string[] = []

    function searchFiles(dir: string) {
      const files = fs.readdirSync(dir)

      for (const file of files) {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)

        if (stat.isDirectory()) {
          searchFiles(filePath)
        } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
          try {
            const content = fs.readFileSync(filePath, "utf8")
            if (content.includes("batch_id")) {
              const lines = content.split("\n")
              lines.forEach((line, index) => {
                if (line.includes("batch_id")) {
                  batchReferences.push(`${filePath}:${index + 1} - ${line.trim()}`)
                }
              })
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    }

    searchFiles(searchDir)

    return NextResponse.json({
      success: true,
      references: batchReferences,
      count: batchReferences.length,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
