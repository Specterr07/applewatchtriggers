import { Search, X } from 'lucide-react'

import { Input } from '@/components/ui/Input'

type SearchInputProps = {
  value: string
  onChange: (value: string) => void
  label: string // accessible name, e.g. "Search tasks"
  placeholder?: string
}

// A search box with a magnifier icon and a clear (×) button.
export function SearchInput({ value, onChange, label, placeholder }: SearchInputProps) {
  return (
    <div className="relative">
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-secondary" />
      <Input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pr-11 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="absolute top-0 right-0 grid size-11 cursor-pointer place-items-center text-secondary hover:text-foreground"
        >
          <X aria-hidden className="size-4" />
        </button>
      )}
    </div>
  )
}
