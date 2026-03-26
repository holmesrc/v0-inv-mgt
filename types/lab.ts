export interface LabConfig {
  locations: {
    prefix: string
    defaultLocation: string
  }
  suppliers: string[]
  slackWebhookUrl?: string
  alertSettings?: {
    defaultReorderPoint: number
    lowStockThreshold: number
  }
}

export interface Lab {
  id: string
  slug: string
  name: string
  config: LabConfig
}
