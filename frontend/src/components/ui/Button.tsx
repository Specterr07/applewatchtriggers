import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/utils/cn'

// Shared look for buttons, and for links that should look like buttons
// (use buttonVariants() on the <a>/<Link> instead of nesting a <button>).
// Every size is at least 44px tall - the spec's minimum touch target.
export const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-control text-base font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-accent-strong text-on-accent hover:bg-accent-strong/90',
        secondary: 'border border-border bg-surface text-foreground hover:bg-surface-muted',
        ghost: 'text-foreground hover:bg-surface-muted',
        // Destructive actions. Hover darkens (brightness) instead of fading,
        // so white-on-red stays above WCAG AA's 4.5:1 in both themes.
        danger: 'bg-danger-strong text-on-accent hover:brightness-90',
      },
      size: {
        default: 'h-11 px-4',
        icon: 'size-11',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>

// A styled <button>. Defaults to type="button" so it never submits a form by accident.
export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
