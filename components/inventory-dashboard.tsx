"use client"

import type React from "react"
import { useState, useEffect } from "react"

interface InventoryItem {
  id: number
  name: string
  quantity: number
  packageType: string
  supplier: string
  location: string
  reorderPoint: number
}

interface AddInventoryItemProps {
  onAddItem: (item: InventoryItem) => void
  packageTypes: string[]
  suppliers: string[]
  locations: string[]
  defaultReorderPoint: number
}

const AddInventoryItem: React.FC<AddInventoryItemProps> = ({
  onAddItem,
  packageTypes,
  suppliers,
  locations,
  defaultReorderPoint,
}) => {
  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState(0)
  const [packageType, setPackageType] = useState(packageTypes[0] || "")
  const [supplier, setSupplier] = useState(suppliers[0] || "")
  const [location, setLocation] = useState(locations[0] || "")
  const [reorderPoint, setReorderPoint] = useState(defaultReorderPoint)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newItem: InventoryItem = {
      id: Date.now(), // Generate a unique ID
      name,
      quantity,
      packageType,
      supplier,
      location,
      reorderPoint,
    }
    onAddItem(newItem)
    setName("")
    setQuantity(0)
    setPackageType(packageTypes[0] || "")
    setSupplier(suppliers[0] || "")
    setLocation(locations[0] || "")
    setReorderPoint(defaultReorderPoint)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Name:
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Quantity:
        <input type="number" value={quantity} onChange={(e) => setQuantity(Number.parseInt(e.target.value))} required />
      </label>
      <label>
        Package Type:
        <select value={packageType} onChange={(e) => setPackageType(e.target.value)}>
          {packageTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label>
        Supplier:
        <select value={supplier} onChange={(e) => setSupplier(e.target.value)}>
          {suppliers.map((supplier) => (
            <option key={supplier} value={supplier}>
              {supplier}
            </option>
          ))}
        </select>
      </label>
      <label>
        Location:
        <select value={location} onChange={(e) => setLocation(e.target.value)}>
          {locations.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </label>
      <label>
        Reorder Point:
        <input
          type="number"
          value={reorderPoint}
          onChange={(e) => setReorderPoint(Number.parseInt(e.target.value))}
          required
        />
      </label>
      <button type="submit">Add Item</button>
    </form>
  )
}

const InventoryDashboard: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [uniquePackageTypes, setUniquePackageTypes] = useState<string[]>([])
  const [uniqueSuppliers, setUniqueSuppliers] = useState<string[]>([])
  const [uniqueLocations, setUniqueLocations] = useState<string[]>([])

  useEffect(() => {
    // Mock data for initial inventory
    const initialInventory: InventoryItem[] = [
      {
        id: 1,
        name: "Widget A",
        quantity: 10,
        packageType: "Box",
        supplier: "Supplier X",
        location: "Warehouse 1",
        reorderPoint: 5,
      },
      {
        id: 2,
        name: "Gadget B",
        quantity: 5,
        packageType: "Pallet",
        supplier: "Supplier Y",
        location: "Warehouse 2",
        reorderPoint: 3,
      },
    ]
    setInventory(initialInventory)

    // Extract unique values for dropdowns
    const packageTypes = [...new Set(initialInventory.map((item) => item.packageType))]
    const suppliers = [...new Set(initialInventory.map((item) => item.supplier))]
    const locations = [...new Set(initialInventory.map((item) => item.location))]

    setUniquePackageTypes(packageTypes)
    setUniqueSuppliers(suppliers)
    setUniqueLocations(locations)
  }, [])

  const handleAddItem = (newItem: InventoryItem) => {
    setInventory([...inventory, newItem])

    // Update unique values
    setUniquePackageTypes((prev) => [...new Set([...prev, newItem.packageType])])
    setUniqueSuppliers((prev) => [...new Set([...prev, newItem.supplier])])
    setUniqueLocations((prev) => [...new Set([...prev, newItem.location])])
  }

  return (
    <div>
      <h1>Inventory Dashboard</h1>
      <AddInventoryItem
        onAddItem={handleAddItem}
        packageTypes={uniquePackageTypes}
        suppliers={uniqueSuppliers}
        locations={uniqueLocations}
        defaultReorderPoint={5}
      />
      <h2>Inventory List</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Quantity</th>
            <th>Package Type</th>
            <th>Supplier</th>
            <th>Location</th>
            <th>Reorder Point</th>
          </tr>
        </thead>
        <tbody>
          {inventory.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.quantity}</td>
              <td>{item.packageType}</td>
              <td>{item.supplier}</td>
              <td>{item.location}</td>
              <td>{item.reorderPoint}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default InventoryDashboard
