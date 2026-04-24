export function validateImei(imei: string): boolean {
  const digits = imei.replace(/\D/g, '')
  if (digits.length !== 15) return false

  // Luhn algorithm
  let sum = 0
  for (let i = 0; i < 15; i++) {
    let d = parseInt(digits[i])
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

export function parseImeiFromBarcode(raw: string): string | null {
  const cleaned = raw.replace(/\D/g, '')
  // Some barcode formats prefix with "01" (GS1-128)
  if (cleaned.length === 17 && cleaned.startsWith('01')) {
    const candidate = cleaned.slice(2)
    if (validateImei(candidate)) return candidate
  }
  if (cleaned.length === 15 && validateImei(cleaned)) return cleaned
  return null
}

export function maskImei(imei: string): string {
  return `***********${imei.slice(-4)}`
}
