import { Providers } from '../../components/providers'
import DashboardLayout from '../../components/DashboardLayout'
import type { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <DashboardLayout>{children}</DashboardLayout>
    </Providers>
  )
}
