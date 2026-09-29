import type { ReactNode } from 'react'

// Standard page frame: title, optional description and actions, then
// content - with the spec's gutters (16px phone, 32px desktop).
type PageProps = {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

export function Page({ title, description, actions, children }: PageProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-8 md:px-8 md:pt-10">
      {/* The title keeps at least 16rem; when title and actions don't both
          fit (narrow phones), the actions wrap onto their own line below. */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-64">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-base text-secondary-on-bg">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  )
}
