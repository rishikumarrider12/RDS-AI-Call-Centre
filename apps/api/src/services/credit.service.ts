import { CreditRepository } from '../repositories/credit.repository'
import { TransactionRepository } from '../repositories/transaction.repository'
import type { Credit } from '@rds/types'
import { recordAudit } from '../lib/audit'

export class CreditService {
  private creditRepo = new CreditRepository()
  private transactionRepo = new TransactionRepository()

  private toCredit(row: any): Credit {
    return {
      id: row.id,
      organizationId: row.organization_id,
      amount: Number(row.amount),
      currency: row.currency,
      reason: row.reason ?? null,
      expiresAt: row.expires_at ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async list(organizationId: string): Promise<Credit[]> {
    const rows = await this.creditRepo.list(organizationId)
    return rows.map((r: any) => this.toCredit(r))
  }

  async getById(organizationId: string, id: string): Promise<Credit> {
    const row = await this.creditRepo.findById(organizationId, id)
    if (!row) throw new Error('Credit not found')
    return this.toCredit(row)
  }

  async getBalance(organizationId: string): Promise<number> {
    return this.creditRepo.getBalance(organizationId)
  }

  async create(organizationId: string, createdById: string, input: {
    amount: number
    currency?: string
    reason?: string | null
    expiresAt?: string | null
  }): Promise<Credit> {
    if (input.amount <= 0) throw new Error('Credit amount must be positive')

    const row = await this.creditRepo.create(organizationId, input)

    await recordAudit({
      organizationId,
      action: 'credit.create',
      actorId: createdById,
      resourceType: 'credit',
      resourceId: row.id,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toCredit(row)
  }

  async apply(organizationId: string, createdById: string, creditId: string, invoiceId: string, amount: number): Promise<{ credit: Credit; transactionId: string }> {
    const credit = await this.creditRepo.findById(organizationId, creditId)
    if (!credit) throw new Error('Credit not found')
    if (Number(credit.amount) < amount) throw new Error('Insufficient credit balance')

    const transaction = await this.transactionRepo.create(organizationId, {
      type: 'debit',
      amount: -amount,
      currency: credit.currency,
      invoiceId,
      creditId,
      description: 'Applied credit to invoice',
      metadata: { creditId },
    })

    await recordAudit({
      organizationId,
      action: 'credit.apply',
      actorId: createdById,
      resourceType: 'credit',
      resourceId: creditId,
      after: { appliedAmount: amount, invoiceId } as Record<string, unknown>,
    })

    return { credit: this.toCredit(credit), transactionId: transaction.id }
  }

  async delete(organizationId: string, createdById: string, id: string): Promise<void> {
    const existing = await this.creditRepo.findById(organizationId, id)
    if (!existing) throw new Error('Credit not found')
    await this.creditRepo.softDelete(organizationId, id)

    await recordAudit({
      organizationId,
      action: 'credit.delete',
      actorId: createdById,
      resourceType: 'credit',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
    })
  }
}
