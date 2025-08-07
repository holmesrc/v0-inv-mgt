"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export default function BatchReferencesPage() {
  const [references, setReferences] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReferences()
  }, [])

  const loadReferences = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/debug/batch-references")
      const result = await response.json()

      if (result.success) {
        setReferences(result.references)
      } else {
        setError(result.error)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load references")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Searching for batch_id references...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Batch ID References</h1>
          <p className="text-muted-foreground">Find all references to batch_id in the codebase</p>
        </div>
        <Button onClick={loadReferences} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Found References ({references.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {references.length === 0 ? (
            <p className="text-green-600">✅ No batch_id references found!</p>
          ) : (
            <div className="space-y-2">
              {references.map((ref, index) => (
                <div key={index} className="bg-gray-100 p-2 rounded font-mono text-sm">
                  {ref}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
