import { LabProvider } from "@/lib/lab-context"

export default async function LabLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lab: string }>
}) {
  const { lab } = await params

  return <LabProvider slug={lab}>{children}</LabProvider>
}
