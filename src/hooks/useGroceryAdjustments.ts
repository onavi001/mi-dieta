import { useState } from 'react'
import type { GroceryAdjustment } from '../types/domain'

// Hook para gestionar ajustes manuales en la lista de compras
export function useGroceryAdjustments(onSync?: (adjustments: GroceryAdjustment[]) => void) {
  const [adjustments, setAdjustments] = useState<GroceryAdjustment[]>([])

  const getAdjustment = (productName: string): GroceryAdjustment | undefined => {
    return adjustments.find((adj) => adj.productName === productName)
  }

  const updateAdjustment = (productName: string, customQty: string, customNote?: string) => {
    setAdjustments((prev) => {
      const existing = prev.findIndex((adj) => adj.productName === productName)
      const next = existing >= 0
        ? prev.map((adj, i) => (i === existing ? { productName, customQty, customNote } : adj))
        : [...prev, { productName, customQty, customNote }]
      onSync?.(next)
      return next
    })
  }

  const removeAdjustment = (productName: string) => {
    setAdjustments((prev) => {
      const next = prev.filter((adj) => adj.productName !== productName)
      onSync?.(next)
      return next
    })
  }

  const clearAllAdjustments = () => {
    setAdjustments((prev) => {
      void prev
      onSync?.([])
      return []
    })
  }

  const restoreAdjustments = (next: GroceryAdjustment[]) => {
    setAdjustments(next)
  }

  return {
    adjustments,
    getAdjustment,
    updateAdjustment,
    removeAdjustment,
    clearAllAdjustments,
    restoreAdjustments,
  }
}
