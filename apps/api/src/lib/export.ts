export interface ExportColumn {
  key: string
  header: string
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return ''
    }
  }
  return String(value)
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Converts an array of flat row objects into an RFC-4180 CSV string.
 * JSON/object values are stringified and escaped.
 */
export function toCsv(rows: Array<Record<string, unknown>>, columns: ExportColumn[]): string {
  const header = columns.map((c) => escapeCsv(c.header)).join(',')
  const body = rows
    .map((row) => columns.map((c) => escapeCsv(cellToString(row[c.key]))).join(','))
    .join('\r\n')
  return `${header}\r\n${body}`
}

/**
 * Sends a tabular dataset as a downloadable CSV file.
 */
export function sendCsv(
  res: import('express').Response,
  filename: string,
  rows: Array<Record<string, unknown>>,
  columns: ExportColumn[]
) {
  const csv = toCsv(rows, columns)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.status(200).send(`\uFEFF${csv}`)
}

/**
 * Sends arbitrary data as a downloadable JSON file.
 */
export function sendJson(
  res: import('express').Response,
  filename: string,
  data: unknown
) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.status(200).send(JSON.stringify(data, null, 2))
}
