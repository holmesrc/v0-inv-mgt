"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ColumnMapperProps {
  columns: string[]
  columnTypes: { [key: string]: string }
  sampleData: any[]
  onMappingComplete: (mapping: { [key: string]: string }) => void
}

const STANDARD_FIELDS = [
  { key: "partNumber", label: "Part Number", required: true },
  { key: "description", label: "Description", required: true },
  { key: "category", label: "Category", required: false },
  { key: "currentStock", label: "Current Stock", required: true },
  { key: "reorderPoint", label: "Reorder Point", required: false },
  { key: "unitCost", label: "Unit Cost", required: false },
  { key: "supplier", label: "Supplier", required: false },
  { key: "location", label: "Location", required: false },
]

export default function ColumnMapper({ columns, columnTypes, sampleData, onMappingComplete }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<{ [key: string]: string }>({
    partNumber: "",
    description: "",
    category: "",
    currentStock: "",
    reorderPoint: "",
    unitCost: "",
    supplier: "",
    location: "",
  })

  const handleMappingChange = (standardField: string, excelColumn: string) => {
    setMapping((prev) => ({
      ...prev,
      [standardField]: excelColumn,
    }))
  }

  const handleComplete = () => {
    onMappingComplete(mapping)
  }

  const isValid = STANDARD_FIELDS.filter((field) => field.required).every((field) => mapping[field.key])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Map Your Excel Columns</CardTitle>
          <CardDescription>
            Map your Excel columns (A1-G1) to the standard inventory fields. The system has automatically detected{" "}
            {columns.length} columns from your Excel file. Required fields are marked with a red badge.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {STANDARD_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="min-w-[120px]">{field.label}</Label>
                  {field.required && (
                    <Badge variant="destructive" className="text-xs">
                      Required
                    </Badge>
                  )}
                </div>
                <Select
                  value={mapping[field.key] || "-- Not mapped --"}
                  onValueChange={(value) => handleMappingChange(field.key, value)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-- Not mapped --">-- Not mapped --</SelectItem>
                    {columns.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column} ({columnTypes[column]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Only columns A1-G1 from your Excel file are being processed. Any content in column
              J1 (categorization notes) has been ignored as requested.
            </p>
          </div>

          <div className="mt-6">
            <Button onClick={handleComplete} disabled={!isValid} className="w-full">
              Complete Mapping
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview Your Data</CardTitle>
          <CardDescription>Here's a preview of your Excel data (first 5 rows)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column}>
                    {column}
                    <Badge variant="outline" className="ml-2 text-xs">
                      {columnTypes[column]}
                    </Badge>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleData.slice(0, 5).map((row, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column}>{row[column]?.toString() || "—"}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
