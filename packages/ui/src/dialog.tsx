import * as React from 'react'
import { cn } from './utils'
import { X } from 'lucide-react'

export interface DialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export function Dialog({ open, onClose, children, className }: DialogProps) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative bg-neutral-900 border border-neutral-800 max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl',
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

export interface DialogHeaderProps {
  title: string
  onClose?: () => void
  children?: React.ReactNode
}

export function DialogHeader({ title, onClose, children }: DialogHeaderProps) {
  return (
    <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/40">
      <div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
        {children}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6', className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex gap-3 justify-end border-t border-neutral-800 pt-5 mt-6', className)} {...props} />
}
