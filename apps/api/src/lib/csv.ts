export interface ParsedCsv {
  headers: string[]
  rows: string[][]
}

/**
 * Minimal RFC-4180 compliant CSV parser supporting quoted fields,
 * embedded commas, newlines and escaped double quotes ("").
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

  // Push trailing field/row if present
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = rows[0].map((h) => h.trim())
  return { headers, rows: rows.slice(1).filter((r) => r.some((c) => c.trim().length > 0)) }
}

/**
 * Normalizes a header name for flexible column matching.
 */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

const HEADER_ALIASES: Record<string, string[]> = {
  firstName: ['firstname', 'first', 'fname', 'givenname', 'given'],
  lastName: ['lastname', 'last', 'lname', 'surname', 'familyname', 'family'],
  email: ['email', 'mail', 'e-mail'],
  phone: ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'telephone', 'tel', 'cell', 'cellphone'],
  country: ['country'],
  timezone: ['timezone', 'timeZone', 'tz'],
  tags: ['tags', 'tag'],
  source: ['source'],
  dndStatus: ['dnd', 'dndstatus', 'donotcall', 'donotdisturb'],
}

/**
 * Builds a map from normalized header index to canonical field name.
 */
export function buildHeaderMap(headers: string[]): Record<number, string> {
  const map: Record<number, string> = {}
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header)
    if (!normalized) return
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (normalized === field || aliases.includes(normalized)) {
        map[index] = field
        break
      }
    }
  })
  return map
}
