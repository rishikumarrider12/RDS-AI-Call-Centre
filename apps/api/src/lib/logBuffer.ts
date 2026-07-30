export interface LogEntry {
  id: string
  timestamp: string
  level: number | string
  message: string
  source?: string
}

export interface SystemResource {
  cpuUsage: number
  memoryUsage: number
  memoryTotal: number
  memoryFree: number
  diskUsage: number
  diskTotal: number
  diskFree: number
  uptimeSeconds: number
  loadAverage: number[]
  platform: string
  arch: string
  hostname: string
}

export interface ProductionConfigEntry {
  key: string
  value: string | null
  redacted: boolean
  description?: string
}

export interface ServiceControlAction {
  action: 'restart' | 'shutdown'
  description: string
}

export class LogBuffer {
  private entries: LogEntry[] = []
  private maxSize = 1000

  add(parsed: Record<string, unknown>): void {
    const level = typeof parsed.level === 'number' ? parsed.level : (parsed.level as string) || 'info'
    const message = typeof parsed.msg === 'string' ? parsed.msg : JSON.stringify(parsed.msg || parsed.message || '')
    const timestamp = typeof parsed.time === 'string' ? parsed.time : new Date().toISOString()

    this.entries.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp,
      level: String(level),
      message,
      source: parsed.source as string | undefined,
    })

    if (this.entries.length > this.maxSize) {
      this.entries.shift()
    }
  }

  getEntries(options?: { level?: string; search?: string; limit?: number }): LogEntry[] {
    let result = [...this.entries]

    if (options?.level) {
      result = result.filter((e) => e.level === options.level || String(e.level) === options.level)
    }

    if (options?.search) {
      const q = options.search.toLowerCase()
      result = result.filter((e) => e.message.toLowerCase().includes(q) || e.source?.toLowerCase().includes(q))
    }

    if (options?.limit) {
      result = result.slice(-options.limit)
    }

    return result.reverse()
  }

  clear(): void {
    this.entries = []
  }

  get size(): number {
    return this.entries.length
  }
}

export const logBuffer = new LogBuffer()
