'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { X, ChevronLeft, ChevronRight, Sparkles, Check } from 'lucide-react'

export interface TourStep {
  target: string
  title: string
  description: string
}

interface TourContextValue {
  startTour: (steps?: TourStep[]) => void
  restartTour: () => void
  skipTour: () => void
  isOpen: boolean
}

const STORAGE_KEY = 'rds-onboarding-tour-completed'
const TourContext = createContext<TourContextValue | null>(null)

export function useTour() {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error('useTour must be used within TourProvider')
  return ctx
}

export const DEFAULT_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour-id="nav"]',
    title: 'Welcome to RDS',
    description:
      'This quick tour highlights the key areas of your call centre console. You can skip at any time.',
  },
  {
    target: '[data-tour-id="nav-campaigns"]',
    title: 'Campaigns',
    description: 'Build outbound and inbound AI calling campaigns, then track progress and spend.',
  },
  {
    target: '[data-tour-id="nav-contacts"]',
    title: 'Contacts',
    description: 'Import and manage contact lists, then assign them to your campaigns.',
  },
  {
    target: '[data-tour-id="nav-calls"]',
    title: 'Calls',
    description: 'Review call history with recordings, transcripts and AI-generated summaries.',
  },
  {
    target: '[data-tour-id="nav-live"]',
    title: 'Live Monitor',
    description: 'Watch calls connect and complete in real time as your agents work.',
  },
  {
    target: '[data-tour-id="nav-billing"]',
    title: 'Billing & Subscriptions',
    description: 'Track spend, manage your plan and download invoices on the Billing page.',
  },
  {
    target: '[data-tour-id="nav-settings"]',
    title: 'Settings & Integrations',
    description:
      'Configure webhooks, integrations, notifications and audit logs here. You can replay this tour anytime from Settings.',
  },
]

export function TourProvider({ children }: { children: ReactNode }) {
  const [steps, setSteps] = useState<TourStep[]>(DEFAULT_TOUR_STEPS)
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const updateRect = useCallback(() => {
    if (!open) return
    const el = document.querySelector(steps[index]?.target)
    setRect(el ? el.getBoundingClientRect() : null)
  }, [open, steps, index])

  useEffect(() => {
    updateRect()
  }, [updateRect])

  useEffect(() => {
    if (!open) return
    const onScroll = () => updateRect()
    const onResize = () => updateRect()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skipTour()
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, updateRect])

  const finish = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      /* ignore */
    }
    setOpen(false)
  }, [])

  const skipTour = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      /* ignore */
    }
    setOpen(false)
  }, [])

  const startTour = useCallback((customSteps?: TourStep[]) => {
    if (customSteps) setSteps(customSteps)
    setIndex(0)
    setOpen(true)
  }, [])

  const restartTour = useCallback(() => {
    setSteps(DEFAULT_TOUR_STEPS)
    setIndex(0)
    setOpen(true)
  }, [])

  // Auto-start on first visit (client only, once per session mount)
  useEffect(() => {
    let completed = false
    try {
      completed = localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      /* ignore */
    }
    if (completed) return
    const t = setTimeout(() => {
      setSteps(DEFAULT_TOUR_STEPS)
      setIndex(0)
      setOpen(true)
    }, 800)
    return () => clearTimeout(t)
  }, [])

  const step = steps[index]
  const isLast = index === steps.length - 1

  const handleNext = () => {
    if (isLast) finish()
    else setIndex((i) => i + 1)
  }
  const handleBack = () => setIndex((i) => Math.max(0, i - 1))

  let tooltipStyle: React.CSSProperties
  if (rect) {
    const left = Math.min(Math.max(rect.left, 12), Math.max(12, window.innerWidth - 352))
    const top = rect.bottom + 14
    tooltipStyle = {
      top: Math.min(top, window.innerHeight - 230),
      left: Math.max(12, left),
    }
  } else {
    tooltipStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }

  return (
    <TourContext.Provider value={{ startTour, restartTour, skipTour, isOpen: open }}>
      {children}
      {open && step && (
        <div
          className="fixed inset-0 z-[70]"
          role="dialog"
          aria-modal="true"
          aria-label={`Onboarding tour, step ${index + 1} of ${steps.length}: ${step.title}`}
        >
          {rect ? (
            <div
              className="pointer-events-none fixed rounded-xl border-2 border-violet-500 transition-all duration-300"
              style={{
                top: rect.top - 6,
                left: rect.left - 6,
                width: rect.width + 12,
                height: rect.height + 12,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
              }}
            />
          ) : (
            <div className="pointer-events-none fixed inset-0 bg-black/70" />
          )}

          <div
            className="fixed z-[71] w-[340px] max-w-[calc(100vw-24px)] rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl p-5"
            style={tooltipStyle}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/15 text-violet-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Step {index + 1} / {steps.length}
              </span>
              <button
                type="button"
                onClick={skipTour}
                className="ml-auto text-neutral-500 hover:text-white transition-colors"
                aria-label="Skip tour"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h3 className="text-base font-bold text-white">{step.title}</h3>
            <p className="mt-1.5 text-sm text-neutral-400 leading-relaxed">{step.description}</p>

            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={skipTour}
                className="text-xs font-medium text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Skip tour
              </button>
              <div className="flex items-center gap-2">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-1 rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" /> Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  autoFocus
                  className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                >
                  {isLast ? (
                    <>
                      <Check className="h-4 w-4" /> Finish
                    </>
                  ) : (
                    <>
                      Next <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </TourContext.Provider>
  )
}
