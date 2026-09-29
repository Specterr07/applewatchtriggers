import { ChevronRight, FileCode2, Globe, LogOut, Monitor, Moon, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { APPLE_WATCH, TELEGRAM, type NavItem } from '@/components/layout/navItems'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl'
import { SERVER_TIMEZONE } from '@/config'
import { useAuth } from '@/features/auth/AuthProvider'
import { MASKED_KEY } from '@/features/watch/shortcut'
import { useTheme, type ThemePreference } from '@/hooks/useTheme'

const THEME_OPTIONS: SegmentOption<ThemePreference>[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

// Settings (spec §5.3): appearance, session, time zone and links. There's
// no build version to show yet - nothing in the build records one.
export function SettingsPage() {
  const { preference, setPreference } = useTheme()
  const { signOut } = useAuth()

  return (
    <Page title="Settings">
      <div className="flex max-w-[720px] flex-col gap-6">
        <SettingsSection title="Appearance" description="Light is the default. System follows your device.">
          <Card className="p-4">
            <SegmentedControl
              name="theme"
              label="Theme"
              options={THEME_OPTIONS}
              value={preference}
              onChange={setPreference}
            />
          </Card>
        </SettingsSection>

        <SettingsSection
          title="Session"
          description="Sessions end after 24 hours without activity. Any request Sheev accepts restarts the 24 hours."
        >
          <Card className="divide-y divide-border">
            <div className="flex items-center justify-between gap-4 p-4">
              <span className="text-secondary">API key</span>
              <span className="font-mono text-sm">
                <span aria-hidden>{MASKED_KEY}</span>
                <span className="sr-only">Hidden</span>
              </span>
            </div>
            <div className="p-4">
              <Button variant="secondary" onClick={() => signOut('You have been logged out.')}>
                <LogOut aria-hidden />
                Log out
              </Button>
              <p className="mt-2 text-sm text-secondary">Removes the key from this browser, here and in the old app.</p>
            </div>
          </Card>
        </SettingsSection>

        <SettingsSection title="Time zone">
          <Card className="flex items-center gap-3 p-4">
            <Globe aria-hidden className="size-5 shrink-0 text-secondary" />
            <p>Times are shown in {SERVER_TIMEZONE} (server time).</p>
          </Card>
        </SettingsSection>

        <SettingsSection title="Integrations and help">
          <Card>
            <ul className="divide-y divide-border">
              <NavRow item={APPLE_WATCH} />
              <NavRow item={TELEGRAM} />
              <li>
                {/* A plain <a>: /docs is served by Flask, outside this app. */}
                <a href="/docs" className="flex min-h-14 items-center gap-3 px-4">
                  <FileCode2 aria-hidden className="size-5 text-secondary" />
                  <span className="flex-1 font-medium">API docs</span>
                  <ChevronRight aria-hidden className="size-4 text-secondary" />
                </a>
              </li>
            </ul>
          </Card>
        </SettingsSection>
      </div>
    </Page>
  )
}

// A titled settings group.
function SettingsSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-md font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-secondary-on-bg">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function NavRow({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <li>
      <Link to={item.path} className="flex min-h-14 items-center gap-3 px-4">
        <Icon aria-hidden className="size-5 text-secondary" />
        <span className="flex-1 font-medium">{item.label}</span>
        <ChevronRight aria-hidden className="size-4 text-secondary" />
      </Link>
    </li>
  )
}
