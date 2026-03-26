"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package } from "lucide-react"
import type { Lab } from "@/types/lab"
import Link from "next/link"

export default function LabSelector() {
  const [labs, setLabs] = useState<Lab[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/labs")
      .then((res) => res.json())
      .then((data) => setLabs(data.labs || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Package className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Select your lab to continue</p>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground">Loading labs...</div>
        ) : labs.length === 0 ? (
          <div className="text-center text-muted-foreground">
            No labs configured. Please run the database migration first.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {labs.map((lab) => (
              <Link key={lab.slug} href={`/${lab.slug}`}>
                <Card className="cursor-pointer hover:border-primary transition-colors h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{lab.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {lab.config.suppliers?.length || 0} suppliers configured
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Location prefix: {lab.config.locations?.prefix || "H"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
