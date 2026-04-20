import {
  GROUP_GRAMS_PER_PORTION,
  INGREDIENT_REFERENCE,
  normalizeIngredientText,
  normalizeIngredientUnit,
} from '@/data/reference/ingredientReference'
import { detectIngredientGroup, unitToGramsFactor } from '@/data/reference/ingredientConversionUtils'
import type { ConversionModalState, IngredientConversion, PieceSizeConversion } from './mealCardTypes'
import { UNIT_LABELS, UNIT_PRIORITY } from './mealCardConstants'

export function buildConversionModalState(
  ingredient: { id: string; cantidad: number; unidad: string },
  effectiveAmount: number
): ConversionModalState | null {
  if (!Number.isFinite(effectiveAmount) || effectiveAmount <= 0) {
    return null
  }

  const group = detectIngredientGroup(ingredient.id, ingredient.id)
  const sourceUnit = normalizeIngredientUnit(ingredient.unidad)
  const sourceFactor = unitToGramsFactor(sourceUnit, group, ingredient.id)
  if (!sourceFactor) {
    return null
  }

  const grams = effectiveAmount * sourceFactor
  if (!Number.isFinite(grams) || grams <= 0) {
    return null
  }

  const referenceUnits = Object.keys(
    INGREDIENT_REFERENCE[normalizeIngredientText(ingredient.id)]?.unitToGrams || {}
  )

  const candidateUnits = new Set<string>([...UNIT_PRIORITY, ...referenceUnits, sourceUnit])

  const conversions: IngredientConversion[] = []
  for (const unit of candidateUnits) {
    const factor = unitToGramsFactor(unit, group, ingredient.id)
    if (!factor) continue

    const converted = grams / factor
    if (!Number.isFinite(converted) || converted <= 0) continue

    conversions.push({
      label: UNIT_LABELS[unit] || unit,
      value: converted,
    })
  }

  conversions.sort((a, b) => a.value - b.value)

  const ingredientRef = INGREDIENT_REFERENCE[normalizeIngredientText(ingredient.id)]
  const pieceSizeConversions: PieceSizeConversion[] = ingredientRef?.pieceSizeGrams
    ? [
        {
          sizeLabel: 'Pieza chica',
          gramsPerPiece: ingredientRef.pieceSizeGrams.small,
          piecesForCurrent: grams / ingredientRef.pieceSizeGrams.small,
        },
        {
          sizeLabel: 'Pieza mediana',
          gramsPerPiece: ingredientRef.pieceSizeGrams.medium,
          piecesForCurrent: grams / ingredientRef.pieceSizeGrams.medium,
        },
        {
          sizeLabel: 'Pieza grande',
          gramsPerPiece: ingredientRef.pieceSizeGrams.large,
          piecesForCurrent: grams / ingredientRef.pieceSizeGrams.large,
        },
      ]
    : []

  const pieceFactor = unitToGramsFactor('piece', group, ingredient.id)
  const pieceGrams = pieceFactor && Number.isFinite(pieceFactor) && pieceFactor > 0 ? pieceFactor : null
  const pieceAmount = pieceGrams ? grams / pieceGrams : null
  const portions = group ? grams / GROUP_GRAMS_PER_PORTION[group] : null

  return {
    ingredientId: ingredient.id,
    sourceAmount: effectiveAmount,
    sourceUnit,
    grams,
    pieceGrams,
    pieceAmount,
    pieceSizeConversions,
    group,
    portions,
    conversions,
  }
}
