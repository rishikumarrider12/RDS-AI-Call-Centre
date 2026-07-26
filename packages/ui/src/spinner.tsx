import * as React from 'react'
import { cn } from './utils'
import { Loader2 } from 'lucide-react'

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number
  label?: string
}

export function Spinner({ size = 20, label, className, ...props }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label || 'Loading'}
      className={cn('inline-flex items-center justify-center', className)}
      {...props}
    >
      <Loader2 className="animate-spin" style={{ width: size, height: size }} />
    </span>
  )
}
