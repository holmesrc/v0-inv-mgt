export interface LabConfig {
  city: string
  suppliers: string[]
  slackWebhookUrl?: string
  password?: string
  alertSettings?: {
    defaultReorderPoint: number
  }
}

export interface Lab {
  id: string
  slug: string
  name: string
  config: LabConfig
}
