"use client"

import InventoryDashboard from "@/components/inventory-dashboard"
import { useLab } from "@/lib/lab-context"

export default function LabDashboard() {
  const { lab, loading, error } = useLab()

  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading lab...</div>
  if (error || !lab) return <div className="flex items-center justify-center min-h-screen text-destructive">Lab not found</div>

  return <InventoryDashboard />
}
