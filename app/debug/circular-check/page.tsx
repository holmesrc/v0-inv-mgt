"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CircularDependencyCheck() {
  const [imports, setImports] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkImports = async () => {
      try {
        // Try to import each component and see what it imports
        const results: { [key: string]: string } = {}

        try {
          const fileUploadModule = await import("@/components/file-upload")
          results["file-upload"] = "Successfully imported"
        } catch (err) {
          results["file-upload"] = `Error: ${err instanceof Error ? err.message : String(err)}`
        }

        try {
          const dashboardModule = await import("@/components/inventory-dashboard")
          results["inventory-dashboard"] = "Successfully imported"
        } catch (err) {
          results["inventory-dashboard"] = `Error: ${err instanceof Error ? err.message : String(err)}`
        }

        try {
          const addItemModule = await import("@/components/add-inventory-item")
          results["add-inventory-item"] = "Successfully imported"
        } catch (err) {
          results["add-inventory-item"] = `Error: ${err instanceof Error ? err.message : String(err)}`
        }

        setImports(results)
      } catch (err) {
        setError(`Overall error: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
      }
    }

    checkImports()
  }, [])

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Circular Dependency Check</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">This tool checks for circular dependencies between components.</p>

          {loading && <p>Checking imports...</p>}

          {error && (
            <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {!loading && (
            <div className="space-y-4">
              {Object.entries(imports).map(([component, result]) => (
                <div
                  key={component}
                  className={`p-4 rounded-md ${result.includes("Error") ? "bg-red-50" : "bg-green-50"}`}
                >
                  <h3 className="font-bold">{component}</h3>
                  <p className={result.includes("Error") ? "text-red-700" : "text-green-700"}>{result}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
