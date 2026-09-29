import type { LucideIcon } from 'lucide-react'

import { cn } from '@/utils/cn'

export type SegmentOption<T extends string> = {
  value: T
  label: string
  icon?: LucideIcon
}

type SegmentedControlProps<T extends string> = {
  name: string
  // Accessible name for the whole group, e.g. "Theme".
  label: string
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
}

// A row of mutually exclusive options (like iOS's segmented control).
// Built on real radio inputs, so arrow keys and screen readers work
// without any extra code; the inputs are visually hidden and the labels
// are styled instead.
export function SegmentedControl<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <fieldset className="grid auto-cols-fr grid-flow-col gap-1 rounded-control bg-surface-muted p-1">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const Icon = option.icon
        return (
          <label
            key={option.value}
            className={cn(
              'flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[6px] text-base font-medium text-secondary-on-bg transition-colors',
              'has-checked:bg-surface has-checked:text-foreground has-checked:shadow-card',
              'has-focus-visible:outline-2 has-focus-visible:outline-accent',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {Icon && <Icon aria-hidden className="size-4" />}
            {option.label}
          </label>
        )
      })}
    </fieldset>
  )
}
