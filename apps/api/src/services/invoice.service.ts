import { InvoiceRepository } from '../repositories/invoice.repository'
import { PaymentRepository } from '../repositories/payment.repository'

export class InvoiceService {
  private invoiceRepo = new InvoiceRepository()
  private paymentRepo = new PaymentRepository()

  async listInvoices(organizationId: string, options: { status?: string; page?: number; pageSize?: number }) {
    return this.invoiceRepo.list(organizationId, options)
  }

  async getInvoice(organizationId: string, id: string) {
    const row = await this.invoiceRepo.findById(organizationId, id)
    if (!row) throw new Error('Invoice not found')
    return row
  }

  async createInvoice(organizationId: string, input: {
    subscriptionId?: string | null
    amount: number
    currency?: string
    status?: string
    dueAt?: string | null
    lineItems?: Array<Record<string, unknown>>
  }) {
    return this.invoiceRepo.create(organizationId, input)
  }

  async markPaid(organizationId: string, id: string) {
    const invoice = await this.invoiceRepo.updateStatus(organizationId, id, 'paid', new Date().toISOString())
    await this.paymentRepo.create(organizationId, {
      invoiceId: id,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      method: 'auto',
      status: 'succeeded',
    })
    return invoice
  }

  async markVoid(organizationId: string, id: string) {
    return this.invoiceRepo.updateStatus(organizationId, id, 'void')
  }
}
