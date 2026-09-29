import { LogOut, Monitor, Moon, Sun } from 'lucide-react'
import type { ReactNode } from 'react'

import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl'
import { useAuth } from '@/features/auth/AuthProvider'
import { useTheme, type ThemePreference } from '@/hooks/useTheme'

const THEME_OPTIONS: SegmentOption<ThemePreference>[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

// Phase 2 builds only the parts the shell needs - Appearance and Session.
// The rest of spec §5.3's Settings (time zone, integrations, version) is Phase 6.
export function SettingsPage() {
  const { preference, setPreference } = useTheme()
  const { signOut } = useAuth()

  return (
    <Page title="Settings">
      <div className="flex max-w-[720px] flex-col gap-6">
        <SettingsSection title="Appearance" description="Light is the default. System follows your device.">
          <SegmentedControl
            name="theme"
            label="Theme"
            options={THEME_OPTIONS}
            value={preference}
            onChange={setPreference}
          />
        </SettingsSection>

        <SettingsSection
          title="Session"
          description="You're signed in with your API key. Sessions end after 24 hours without activity."
        >
          <Button variant="secondary" onClick={() => signOut('You have been logged out.')}>
            <LogOut aria-hidden />
            Log out
          </Button>
        </SettingsSection>
      </div>
    </Page>
  )
}

// A titled settings group.
function SettingsSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-md font-semibold">{title}</h2>
      <p className="mt-0.5 mb-3 text-secondary-on-bg">{description}</p>
      <Card className="p-4">{children}</Card>
    </section>
  )
}
