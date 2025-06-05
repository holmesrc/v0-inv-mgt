export interface InventoryItem {
  id: string
  "Part number": string
  "MFG Part number": string
  QTY: number
  "Part description": string
  Supplier: string
  Location: string
  Package: string
  lastUpdated?: Date
  reorderPoint?: number
  requester?: string // ADD THIS LINE
}

export interface PurchaseRequest {
  id: string
  partNumber: string
  description: string
  quantity: number
  urgency: "low" | "medium" | "high"
  requestedBy: string
  requestDate: Date
  status: "pending" | "approved" | "ordered"
}

export interface AlertSettings {
  enabled: boolean
  dayOfWeek: number // 0-6 (Sunday-Saturday)
  time: string // HH:MM format
  defaultReorderPoint: number
}

export interface FileUploadResult {
  data: InventoryItem[]
  packageNote: string
  fileName: string
}
