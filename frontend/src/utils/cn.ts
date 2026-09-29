import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// tailwind-merge needs to know our custom theme names (styles/globals.css).
// Without this it would read `text-md` as a text *color* and wrongly drop a
// real color class like `text-secondary` sitting next to it.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['md'],
      radius: ['control', 'card'],
      shadow: ['card', 'raised'],
    },
  },
})

// Joins class names and lets later Tailwind classes override earlier ones
// (e.g. cn('h-11', props.className) where className has 'h-14' -> 'h-14').
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
