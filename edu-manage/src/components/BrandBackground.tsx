'use client'

import { useEffect, useState } from 'react'

export type BrandBackgroundVariant = 'mobile' | 'tablet' | 'desktop'

const VIEW_BOXES: Record<BrandBackgroundVariant, string> = {
  mobile: '0 0 390 844',
  tablet: '0 0 768 1024',
  desktop: '0 0 1600 900',
}

function BrandDefinitions() {
  return (
    <defs>
      <symbol id="brand-logo-mark" viewBox="100 220 1060 820">
        <g fill="#ff7a45">
          <rect x="300" y="240" width="648" height="32" rx="4" />
          <rect x="452" y="272" width="340" height="72" />
          <path d="M452 372H793V420Q793 576 622 576Q452 576 452 420Z" />
          <rect x="872" y="276" width="16" height="158" />
          <circle cx="880" cy="480" r="24" />
          <path d="M112 500L622 636L1140 500L940 782Q925 795 900 800Q750 840 622 963Q500 845 340 800Q310 792 296 780Z" />
        </g>
        <g fill="#0bbfb0">
          <path d="M215 815Q420 830 604 1018Q400 890 214 888Z" />
          <path d="M1020 815Q820 830 632 1018Q840 890 1021 888Z" />
        </g>
      </symbol>
      <symbol id="brand-star-mark" viewBox="-12 -12 24 24">
        <path d="M0-11L3.2-3.4L11-3.2L4.8 1.8L7 10L0 5.4L-7 10L-4.8 1.8L-11-3.2L-3.2-3.4Z" />
      </symbol>
      <symbol id="brand-plus-mark" viewBox="-10 -10 20 20">
        <path d="M-8 0H8M0-8V8" strokeWidth="4" strokeLinecap="round" fill="none" />
      </symbol>
      <linearGradient id="brand-background-gradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff9ee" />
        <stop offset="1" stopColor="#ffeed6" />
      </linearGradient>
      <radialGradient id="brand-glow-orange">
        <stop offset="0" stopColor="#ff7a45" stopOpacity=".34" />
        <stop offset="1" stopColor="#ff7a45" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="brand-glow-teal">
        <stop offset="0" stopColor="#0bbfb0" stopOpacity=".28" />
        <stop offset="1" stopColor="#0bbfb0" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="brand-glow-gold">
        <stop offset="0" stopColor="#ffc145" stopOpacity=".3" />
        <stop offset="1" stopColor="#ffc145" stopOpacity="0" />
      </radialGradient>
    </defs>
  )
}

function Float({ children, speed = 'normal' }: { children: React.ReactNode; speed?: 'normal' | 'slow' | 'short' }) {
  return <g className={`brand-bg-float brand-bg-float--${speed}`}>{children}</g>
}

function Watermark({ variant }: { variant: BrandBackgroundVariant }) {
  if (variant === 'mobile') {
    return (
      <use href="#brand-logo-mark" x="140" y="320" width="280" height="216" opacity=".035" transform="rotate(-6 280 428)" />
    )
  }
  if (variant === 'tablet') {
    return (
      <use href="#brand-logo-mark" x="480" y="90" width="240" height="185" opacity=".04" transform="rotate(-6 600 182)" />
    )
  }
  return (
    <use href="#brand-logo-mark" x="1060" y="150" width="480" height="371" opacity=".035" transform="rotate(-6 1300 335)" />
  )
}

function MobileDecoration() {
  return (
    <g aria-hidden="true">
      <Float speed="slow">
        <circle cx="340" cy="190" r="110" fill="none" stroke="#D6B45B" strokeWidth="1" strokeDasharray="4 6" opacity=".24" />
        <circle cx="340" cy="190" r="150" fill="none" stroke="#D6B45B" strokeWidth="0.75" opacity=".16" />
      </Float>
      <Float>
        <circle cx="50" cy="680" r="130" fill="none" stroke="#14574D" strokeWidth="1" strokeDasharray="3 5" opacity=".16" />
        <circle cx="50" cy="680" r="170" fill="none" stroke="#14574D" strokeWidth="0.75" opacity=".1" />
      </Float>
      <Float speed="short">
        <circle cx="330" cy="640" r="8" fill="#E8784A" opacity=".35" />
      </Float>
      <Float speed="slow">
        <circle cx="45" cy="220" r="6" fill="#14574D" opacity=".3" />
      </Float>
    </g>
  )
}

function TabletDecoration() {
  return (
    <g aria-hidden="true">
      <Float speed="slow">
        <circle cx="680" cy="220" r="140" fill="none" stroke="#D6B45B" strokeWidth="1" strokeDasharray="4 6" opacity=".24" />
        <circle cx="680" cy="220" r="190" fill="none" stroke="#D6B45B" strokeWidth="0.75" opacity=".16" />
      </Float>
      <Float>
        <circle cx="90" cy="820" r="160" fill="none" stroke="#14574D" strokeWidth="1" strokeDasharray="3 5" opacity=".18" />
      </Float>
      <Float speed="short">
        <circle cx="700" cy="780" r="9" fill="#E8784A" opacity=".35" />
      </Float>
      <Float speed="slow">
        <circle cx="80" cy="160" r="7" fill="#14574D" opacity=".3" />
      </Float>
    </g>
  )
}

function DesktopDecoration() {
  return (
    <g aria-hidden="true">
      <Float speed="slow">
        <circle cx="1380" cy="300" r="220" fill="none" stroke="#D6B45B" strokeWidth="1.2" strokeDasharray="5 7" opacity=".25" />
        <circle cx="1380" cy="300" r="290" fill="none" stroke="#D6B45B" strokeWidth="0.8" opacity=".16" />
      </Float>
      <Float>
        <circle cx="220" cy="680" r="200" fill="none" stroke="#14574D" strokeWidth="1" strokeDasharray="4 6" opacity=".18" />
        <circle cx="220" cy="680" r="260" fill="none" stroke="#14574D" strokeWidth="0.75" opacity=".12" />
      </Float>
      <Float speed="short">
        <circle cx="1450" cy="740" r="10" fill="#E8784A" opacity=".35" />
      </Float>
      <Float speed="slow">
        <circle cx="600" cy="140" r="8" fill="#14574D" opacity=".3" />
      </Float>
    </g>
  )
}

function Waves({ variant }: { variant: BrandBackgroundVariant }) {
  if (variant === 'mobile') {
    return (
      <g aria-hidden="true">
        <path d="M0 640Q100 590 200 630T390 610V844H0Z" fill="#ffc145" fillOpacity=".2" />
        <path d="M0 710Q110 660 220 705T390 690V844H0Z" fill="#ff7a45" fillOpacity=".2" />
        <path d="M0 775Q120 740 240 772T390 760V844H0Z" fill="#0bbfb0" fillOpacity=".3" />
      </g>
    )
  }
  if (variant === 'tablet') {
    return (
      <g aria-hidden="true">
        <path d="M0 760Q130 690 260 748T520 742T768 700V1024H0Z" fill="#ffc145" fillOpacity=".2" />
        <path d="M0 842Q150 778 300 832T570 820T768 786V1024H0Z" fill="#ff7a45" fillOpacity=".2" />
        <path d="M0 914Q160 862 320 906T600 892T768 868V1024H0Z" fill="#0bbfb0" fillOpacity=".3" />
      </g>
    )
  }
  return (
    <g aria-hidden="true">
      <path d="M0 690Q260 610 520 680T1040 670T1600 640V900H0Z" fill="#ffc145" fillOpacity=".2" />
      <path d="M0 760Q300 690 600 750T1180 740T1600 720V900H0Z" fill="#ff7a45" fillOpacity=".2" />
      <path d="M0 830Q320 775 640 825T1250 815T1600 800V900H0Z" fill="#0bbfb0" fillOpacity=".3" />
    </g>
  )
}

export function BrandBackgroundScene({ variant }: { variant: BrandBackgroundVariant }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={VIEW_BOXES[variant]}
      preserveAspectRatio="xMidYMax slice"
      className="brand-bg-scene"
      aria-hidden="true"
      focusable="false"
    >
      <BrandDefinitions />
      <rect width="100%" height="100%" fill="url(#brand-background-gradient)" />
      {variant === 'mobile' ? (
        <>
          <circle cx="370" cy="30" r="280" fill="url(#brand-glow-orange)" />
          <circle cx="10" cy="820" r="280" fill="url(#brand-glow-teal)" />
          <circle cx="60" cy="300" r="170" fill="url(#brand-glow-gold)" />
        </>
      ) : variant === 'tablet' ? (
        <>
          <circle cx="26" cy="28" r="260" fill="url(#brand-glow-orange)" />
          <circle cx="742" cy="36" r="260" fill="url(#brand-glow-teal)" />
          <circle cx="22" cy="1000" r="280" fill="url(#brand-glow-gold)" />
          <circle cx="748" cy="1010" r="280" fill="url(#brand-glow-orange)" />
        </>
      ) : (
        <>
          <circle cx="1420" cy="90" r="560" fill="url(#brand-glow-orange)" />
          <circle cx="120" cy="840" r="520" fill="url(#brand-glow-teal)" />
          <circle cx="420" cy="260" r="320" fill="url(#brand-glow-gold)" />
        </>
      )}
      <Watermark variant={variant} />
      {variant === 'mobile' ? <MobileDecoration /> : variant === 'tablet' ? <TabletDecoration /> : <DesktopDecoration />}
      <Waves variant={variant} />
    </svg>
  )
}

function getVariant(): BrandBackgroundVariant {
  if (window.matchMedia('(max-width: 767px)').matches) return 'mobile'
  if (window.matchMedia('(min-width: 768px) and (max-width: 1199px) and (orientation: portrait)').matches) return 'tablet'
  return 'desktop'
}

export default function BrandBackground() {
  const [variant, setVariant] = useState<BrandBackgroundVariant | null>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const updateVariant = () => setVariant(getVariant())
    const updateVisibility = () => setPaused(document.hidden)
    updateVariant()
    updateVisibility()
    window.addEventListener('resize', updateVariant)
    window.addEventListener('orientationchange', updateVariant)
    document.addEventListener('visibilitychange', updateVisibility)
    return () => {
      window.removeEventListener('resize', updateVariant)
      window.removeEventListener('orientationchange', updateVariant)
      document.removeEventListener('visibilitychange', updateVisibility)
    }
  }, [])

  if (!variant) return null

  return (
    <div className={`brand-background${paused ? ' is-paused' : ''}`} aria-hidden="true">
      <BrandBackgroundScene variant={variant} />
    </div>
  )
}

