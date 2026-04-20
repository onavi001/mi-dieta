export function formatQty(value: number): string {
  const rounded = Number(value.toFixed(2))
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

export function formatPortionFraction(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0'

  const whole = Math.floor(value)
  const fraction = value - whole
  const denominators = [2, 3, 4, 6, 8]

  let bestNumerator = 0
  let bestDenominator = 1
  let bestError = Number.POSITIVE_INFINITY

  denominators.forEach((denominator) => {
    const numerator = Math.round(fraction * denominator)
    const approx = numerator / denominator
    const error = Math.abs(fraction - approx)

    if (error < bestError) {
      bestNumerator = numerator
      bestDenominator = denominator
      bestError = error
    }
  })

  if (bestNumerator === 0 || bestError > 0.08) {
    return formatQty(value)
  }

  if (bestNumerator === bestDenominator) {
    return String(whole + 1)
  }

  if (whole === 0) {
    return `${bestNumerator}/${bestDenominator}`
  }

  return `${whole} ${bestNumerator}/${bestDenominator}`
}
