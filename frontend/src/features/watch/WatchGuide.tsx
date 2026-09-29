import { ArrowDown, ArrowRight, Database, Globe, Server, Watch, type LucideIcon } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'

import { Card } from '@/components/ui/Card'

// The static explanations on the Apple Watch screen (spec §4.9): how a
// press reaches the database, and what the common failures mean. The
// JSON below is what routes/tasks.py and app.py actually return.

const FLOW_STEPS: { icon: LucideIcon; title: string; detail: string }[] = [
  { icon: Watch, title: 'Shortcut', detail: 'You tap it on your Watch' },
  { icon: Globe, title: 'GET /toggle?key=…', detail: 'One request, key in the URL' },
  { icon: Server, title: 'Sheev', detail: 'Checks the key, starts or stops' },
  { icon: Database, title: 'tasks.db', detail: 'The task is saved' },
]

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-heading">
      <h2 id="how-it-works-heading" className="text-md font-semibold">
        How it works
      </h2>
      <Card className="mt-3 p-4">
        {/* Side by side only on tablet, where the card is full width; stacked
            on phones and in desktop's two-column layout, where it's narrow. */}
        <ol className="flex flex-col items-stretch gap-1 md:flex-row md:items-center lg:flex-col lg:items-stretch">
          {FLOW_STEPS.map((step, index) => {
            const Icon = step.icon
            return (
              <Fragment key={step.title}>
                {index > 0 && (
                  <li aria-hidden className="grid place-items-center text-secondary">
                    <ArrowDown className="size-4 md:hidden lg:block" />
                    <ArrowRight className="hidden size-4 md:block lg:hidden" />
                  </li>
                )}
                <li className="flex flex-1 items-center gap-3 rounded-control bg-surface-muted px-3 py-2.5 md:flex-col md:items-start md:gap-2 lg:flex-row lg:items-center lg:gap-3">
                  <Icon aria-hidden className="size-5 shrink-0 text-accent" />
                  <div className="min-w-0">
                    <p className="font-medium break-words">{step.title}</p>
                    <p className="text-sm text-secondary-on-bg">{step.detail}</p>
                  </div>
                </li>
              </Fragment>
            )
          })}
        </ol>

        <div className="mt-4 flex flex-col gap-2 text-secondary">
          <p>
            <Code>/toggle</Code> starts a task when nothing is running, and stops the running task otherwise. The Shortcut
            never sends a name - you can rename tasks here afterwards.
          </p>
          <p>
            <Code>/status</Code> only answers what the next press will do, without changing anything. The status card above
            uses it.
          </p>
        </div>
      </Card>
    </section>
  )
}

export function Troubleshooting() {
  return (
    <section aria-labelledby="troubleshooting-heading">
      <h2 id="troubleshooting-heading" className="text-md font-semibold">
        Troubleshooting
      </h2>
      <Card className="mt-3 divide-y divide-border">
        <Problem title="The Shortcut gets a 401">
          <CodeBlock>{'{"ok": false, "message": "Invalid or missing API key"}'}</CodeBlock>
          <p>The key in the Shortcut’s URL doesn’t match the server’s key. Copy the URL above again and paste it into the Shortcut.</p>
        </Problem>
        <Problem title="What a working press returns">
          <CodeBlock>{'{"ok": true, "action": "Start", "id": 42, "message": "Task started at 09:05"}'}</CodeBlock>
          <CodeBlock>{'{"ok": true, "action": "End", "id": 42, "message": "Task ended after 42.0 min"}'}</CodeBlock>
          <p>
            <Code>action</Code> says what this press did, and <Code>id</Code> is the task’s number (#42 in Tasks).
          </p>
        </Problem>
        <Problem title="“Unknown endpoint”">
          <CodeBlock>{'{"ok": false, "message": "Unknown endpoint. Try /toggle or /status"}'}</CodeBlock>
          <p>
            The URL’s path is wrong. It must end in exactly <Code>/toggle?key=…</Code> - no <Code>/app</Code> in front and
            no typos.
          </p>
        </Problem>
      </Card>
    </section>
  )
}

function Problem({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 p-4 text-secondary">
      <h3 className="font-medium text-foreground">{title}</h3>
      {children}
    </div>
  )
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-sm text-foreground">{children}</code>
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-control bg-surface-muted px-3 py-2 font-mono text-sm whitespace-pre-wrap break-all text-foreground">
      {children}
    </pre>
  )
}
