import { Suspense } from 'react'
import VerifyEmailForm from './VerifyEmailForm'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={<p className="text-center text-muted-foreground">Loading...</p>}>
        <VerifyEmailForm />
      </Suspense>
    </div>
  )
}
