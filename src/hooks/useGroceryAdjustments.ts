import { useLocalStorage } from './useLocalStorage'
import type { GroceryAdjustment } from '../data/types'

// Hook para gestionar ajustes manuales en la lista de compras
export function useGroceryAdjustments() {
  const [adjustments, setAdjustments] = useLocalStorage<GroceryAdjustment[]>(
    'groceryAdjustments',
    [],
    {
      migrate: (stored) => {
        if (Array.isArray(stored)) {
          return stored.filter(
            (item: unknown) =>
              typeof item === 'object' &&
              item !== null &&
              'productName' in item &&
              'customQty' in item
          ) as GroceryAdjustment[]
        }
        return []
      },
    }
  )

  // Obtener cantidad personalizada de un producto
  const getAdjustment = (productName: string): GroceryAdjustment | undefined => {
    return adjustments.find((adj) => adj.productName === productName)
  }

  // Actualizar cantidad personalizada
  const updateAdjustment = (productName: string, customQty: string, customNote?: string) => {
    const existing = adjustments.findIndex((adj) => adj.productName === productName)
    if (existing >= 0) {
      const updated = [...adjustments]
      updated[existing] = { productName, customQty, customNote }
      setAdjustments(updated)
    } else {
      setAdjustments([...adjustments, { productName, customQty, customNote }])
    }
  }

  // Eliminar ajuste (volver a cantidad original)
  const removeAdjustment = (productName: string) => {
    setAdjustments(adjustments.filter((adj) => adj.productName !== productName))
  }

  // Limpiar todos los ajustes
  const clearAllAdjustments = () => {
    setAdjustments([])
  }

  return {
    adjustments,
    getAdjustment,
    updateAdjustment,
    removeAdjustment,
    clearAllAdjustments,
  }
}
