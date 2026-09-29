import type { HTMLAttributes } from 'react'

import { cn } from '@/utils/cn'

// The basic surface: white (or dark) panel, subtle border, soft shadow.
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card border border-border bg-surface shadow-card', className)}
      {...props}
    />
  )
}
