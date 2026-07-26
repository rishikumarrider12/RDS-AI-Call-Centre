import { TransactionRepository } from '../repositories/transaction.repository'
import type { Transaction } from '@rds/types'

export class TransactionService {
  private repository = new TransactionRepository()

  private toTransaction(row: any): Transaction {
    return {
      id: row.id,
      organizationId: row.organization_id,
      type: row.type,
      amount: Number(row.amount),
      currency: row.currency,
      invoiceId: row.invoice_id ?? null,
      paymentId: row.payment_id ?? null,
      creditId: row.credit_id ?? null,
      description: row.description ?? null,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
    }
  }

  async list(organizationId: string, options: { page?: number; pageSize?: number; type?: string } = {}) {
    const result = await this.repository.list(organizationId, options)
    return {
      transactions: result.transactions.map((r: any) => this.toTransaction(r)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    }
  }

  async getById(organizationId: string, id: string): Promise<Transaction> {
    const row = await this.repository.findById(organizationId, id)
    if (!row) throw new Error('Transaction not found')
    return this.toTransaction(row)
  }

  async create(organizationId: string, createdById: string, input: {
    type: 'payment' | 'refund' | 'credit' | 'debit' | 'adjustment'
    amount: number
    currency?: string
    invoiceId?: string | null
    paymentId?: string | null
    creditId?: string | null
    description?: string | null
    metadata?: Record<string, unknown>
  }): Promise<Transaction> {
    const row = await this.repository.create(organizationId, input)

    return this.toTransaction(row)
  }
}
