export interface ParsedCsv {
  headers: string[]
  rows: string[][]
}

/**
 * RFC-4180 style CSV parser for the browser (matches backend parsing rules).
 */
export function parseCsv(input: string): ParsedCsv {
  const text = input.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += char
      i++
      continue
    }
    if (char === '"') {
      inQuotes = true
      i++
      continue
    }
    if (char === ',') {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (char === '\r') {
      i++
      continue
    }
    if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i++
      continue
    }
    field += char
    i++
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  if (rows.length === 0) return { headers: [], rows: [] }
  const headers = rows[0].map((h) => h.trim())
  return { headers, rows: rows.slice(1).filter((r) => r.some((c) => c.trim().length > 0)) }
}

/**
 * Lightweight client-side analysis used for the import preview.
 * Detects missing phones and intra-file duplicate phone numbers.
 */
export function analyzeCsv(parsed: ParsedCsv): {
  totalRows: number
  missingPhone: number
  duplicatePhones: number
  validRows: number
  sampleDuplicates: string[]
} {
  const headerIndex = (name: string) => {
    const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '')
    const aliases: Record<string, string[]> = {
      phone: ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'telephone', 'tel', 'cell'],
    }
    if (norm === 'phone' || aliases.phone.includes(norm)) return parsed.headers.indexOf(name)
    if (norm === 'phone') return -1
    for (let i = 0; i < parsed.headers.length; i++) {
      const h = parsed.headers[i].toLowerCase().replace(/[^a-z0-9]/g, '')
      if (h === 'phone' || aliases.phone.includes(h)) return i
    }
    return -1
  }

  const idx = headerIndex('phone')
  const seen = new Set<string>()
  const dupSet = new Set<string>()
  let missingPhone = 0
  const sampleDuplicates: string[] = []

  parsed.rows.forEach((r) => {
    const phone = idx >= 0 ? (r[idx] ?? '').trim() : ''
    if (!phone) {
      missingPhone++
      return
    }
    if (seen.has(phone)) {
      if (!dupSet.has(phone)) {
        dupSet.add(phone)
        if (sampleDuplicates.length < 5) sampleDuplicates.push(phone)
      }
    } else {
      seen.add(phone)
    }
  })

  const duplicatePhones = dupSet.size
  const validRows = parsed.rows.length - missingPhone - duplicatePhones

  return {
    totalRows: parsed.rows.length,
    missingPhone,
    duplicatePhones,
    validRows,
    sampleDuplicates,
  }
}
