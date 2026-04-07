"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Lab } from "@/types/lab"

interface LabContextType {
  lab: Lab | null
  loading: boolean
  error: string | null
  updateConfig: (config: Lab["config"]) => Promise<void>
}

const LabContext = createContext<LabContextType>({
  lab: null,
  loading: true,
  error: null,
  updateConfig: async () => {},
})

export function LabProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [lab, setLab] = useState<Lab | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/labs/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setLab(data.lab)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug])

  const updateConfig = async (config: Lab["config"]) => {
    const res = await fetch(`/api/labs/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    setLab(data.lab)
  }

  return (
    <LabContext.Provider value={{ lab, loading, error, updateConfig }}>
      {children}
    </LabContext.Provider>
  )
}

export const useLab = () => useContext(LabContext)
