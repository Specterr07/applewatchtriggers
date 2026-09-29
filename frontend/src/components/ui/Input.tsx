import type { InputHTMLAttributes } from 'react'

import { cn } from '@/utils/cn'

// A styled text input, 44px tall. The text is 16px on phones on purpose:
// iOS Safari zooms the whole page when you focus an input smaller than that.
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-control border border-border bg-surface px-3 text-md text-foreground placeholder:text-secondary md:text-base',
        'aria-invalid:border-danger-text',
        className,
      )}
      {...props}
    />
  )
}
