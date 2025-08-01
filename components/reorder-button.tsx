"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { ReorderModal } from "./reorder-modal"

interface ReorderButtonProps {
  partNumber: string
  description: string
  currentQty: number
  reorderPoint: number
  supplier?: string
  location?: string
}

export function ReorderButton({ 
  partNumber, 
  description, 
  currentQty, 
  reorderPoint, 
  supplier,
  location 
}: ReorderButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Button 
        onClick={() => setIsModalOpen(true)}
        size="sm"
        className="bg-blue-600 hover:bg-blue-700"
      >
        <ShoppingCart className="h-4 w-4 mr-1" />
        Reorder
      </Button>

      <ReorderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        partNumber={partNumber}
        description={description}
        currentQty={currentQty}
        reorderPoint={reorderPoint}
        supplier={supplier}
        location={location}
      />
    </>
  )
}
