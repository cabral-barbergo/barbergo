'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const ITEM_H      = 48
const HALF        = 2
const BUFFER      = 4
const CENTER_IDX  = HALF + BUFFER
const TOTAL       = CENTER_IDX * 2 + 1
const BASE_TY     = -((CENTER_IDX - HALF) * ITEM_H)
const CONTAINER_H = (HALF * 2 + 1) * ITEM_H

const FRICTION  = 0.95  // velocity fraction retained per 16ms frame
const STOP_VEL  = 0.5   // px/ms — stop inertia below this

interface Props {
  value: number
  onChange: (v: number) => void
  step: number
  min: number
  max?: number
  format?: (v: number) => string
}

export default function DrumPicker({ value, onChange, step, min, max, format }: Props) {
  const [internal, setInternal] = useState(value)

  // Refs that are safe to read inside rAF / event handlers without stale closure issues
  const listRef     = useRef<HTMLDivElement>(null)
  const internalRef = useRef(value)
  const rawOffset   = useRef(0)         // sub-ITEM_H pixel remainder
  const dragging    = useRef(false)
  const rafRef      = useRef(0)
  const startY      = useRef(0)
  const pts         = useRef<{ y: number; t: number }[]>([])  // last 5 gesture points

  const clamp = useCallback(
    (v: number) => Math.max(min, max !== undefined ? Math.min(max, v) : v),
    [min, max]
  )

  const fmt = format ?? ((v: number) => String(v))

  // ── DOM helpers ────────────────────────────────────────────────────

  function applyTransform(offset: number, animated: boolean) {
    const el = listRef.current
    if (!el) return
    el.style.transition = animated ? 'transform 0.15s ease-out' : 'none'
    el.style.transform  = `translateY(${BASE_TY + offset}px)`
  }

  // Tick value by n steps (negative = decrease, positive = increase)
  function tick(steps: number) {
    const next = clamp(internalRef.current + steps * step)
    if (next === internalRef.current) return
    internalRef.current = next
    setInternal(next)
  }

  // Consume pixel offset: each ±ITEM_H/2 boundary crossed fires one tick
  function applyOffset(raw: number) {
    while (raw >  ITEM_H / 2) { tick(-1); raw -= ITEM_H }
    while (raw < -ITEM_H / 2) { tick(+1); raw += ITEM_H }
    rawOffset.current = raw
    applyTransform(raw, false)
  }

  function cancelRaf() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0 }
  }

  // ── Inertia ─────────────────────────────────────────────────────────

  function startInertia(initialVelocity: number) {
    cancelRaf()
    let velocity = initialVelocity
    let lastTime = performance.now()

    function frame(now: number) {
      const dt = Math.min(now - lastTime, 64)  // cap to avoid jumps after tab switch
      lastTime = now

      // Frame-rate-independent friction
      velocity *= Math.pow(FRICTION, dt / 16)

      if (Math.abs(velocity) < STOP_VEL) {
        // Consume remaining sub-item offset, then snap to center
        applyOffset(rawOffset.current)
        applyTransform(0, true)   // 150ms ease-out snap
        onChange(internalRef.current)
        rafRef.current = 0
        return
      }

      applyOffset(rawOffset.current + velocity * dt)
      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
  }

  // ── Velocity calculation ────────────────────────────────────────────

  function addPoint(y: number) {
    pts.current.push({ y, t: performance.now() })
    if (pts.current.length > 5) pts.current.shift()
  }

  function computeVelocity(): number {
    const now    = performance.now()
    const recent = pts.current.filter(p => now - p.t < 100)
    if (recent.length < 2) return 0
    const first = recent[0], last = recent[recent.length - 1]
    const dt = last.t - first.t
    return dt === 0 ? 0 : (last.y - first.y) / dt
  }

  // ── Touch ────────────────────────────────────────────────────────────

  function onTouchStart(e: React.TouchEvent) {
    cancelRaf()
    dragging.current = true
    startY.current = e.touches[0].clientY
    pts.current    = [{ y: startY.current, t: performance.now() }]
    rawOffset.current = 0
    applyTransform(0, false)
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!dragging.current) return
    const y     = e.touches[0].clientY
    const delta = y - startY.current
    startY.current = y
    addPoint(y)
    applyOffset(rawOffset.current + delta)
  }

  function onTouchEnd() {
    if (!dragging.current) return
    dragging.current = false
    const vel = computeVelocity()
    pts.current = []
    startInertia(vel)
  }

  // ── Mouse ─────────────────────────────────────────────────────────────

  function onMouseDown(e: React.MouseEvent) {
    cancelRaf()
    dragging.current = true
    startY.current = e.clientY
    pts.current    = [{ y: startY.current, t: performance.now() }]
    rawOffset.current = 0
    applyTransform(0, false)
    e.preventDefault()
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return
    const y     = e.clientY
    const delta = y - startY.current
    startY.current = y
    addPoint(y)
    applyOffset(rawOffset.current + delta)
  }

  function onMouseUp() {
    if (!dragging.current) return
    dragging.current = false
    const vel = computeVelocity()
    pts.current = []
    startInertia(vel)
  }

  // ── Wheel (1 tick per notch, OS handles its own inertia) ──────────────

  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    cancelRaf()
    tick(-Math.sign(e.deltaY))
    rawOffset.current = 0
    applyTransform(0, false)
    onChange(internalRef.current)
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  useEffect(() => {
    applyTransform(0, false)
    return cancelRaf
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync external value changes (e.g. initial load from API)
  useEffect(() => {
    if (!dragging.current && rafRef.current === 0) {
      internalRef.current = value
      setInternal(value)
      applyTransform(0, false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // ── Render ────────────────────────────────────────────────────────────

  const items = Array.from({ length: TOTAL }, (_, i) => internal + (i - CENTER_IDX) * step)

  return (
    <div
      style={{ position: 'relative', height: CONTAINER_H, width: 160, overflow: 'hidden', userSelect: 'none', touchAction: 'none', cursor: 'grab' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
    >
      {/* Center slot highlight */}
      <div style={{ position: 'absolute', top: HALF * ITEM_H, left: 0, right: 0, height: ITEM_H, background: 'rgba(200,169,126,0.08)', borderTop: '1px solid rgba(200,169,126,0.25)', borderBottom: '1px solid rgba(200,169,126,0.25)', pointerEvents: 'none', zIndex: 1 }} />

      {/* Edge fades */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HALF * ITEM_H, background: 'linear-gradient(to bottom, #111, transparent)', pointerEvents: 'none', zIndex: 2 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: HALF * ITEM_H, background: 'linear-gradient(to top, #111, transparent)', pointerEvents: 'none', zIndex: 2 }} />

      {/* Scrollable list — transform controlled imperatively via listRef */}
      <div ref={listRef} style={{ willChange: 'transform' }}>
        {items.map((v, i) => {
          const dist       = Math.abs(i - CENTER_IDX)
          const isCenter   = dist === 0
          const outOfRange = v < min || (max !== undefined && v > max)
          return (
            <div
              key={i}
              style={{
                height: ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize:   outOfRange ? 0      : isCenter ? '1.45rem' : dist === 1 ? '1rem' : '0.8rem',
                fontWeight: isCenter ? 700 : dist === 1 ? 500 : 400,
                color:      outOfRange ? 'transparent' : isCenter ? '#c8a97e' : '#888',
                opacity:    outOfRange ? 0 : isCenter ? 1 : dist === 1 ? 0.45 : 0.18,
                fontFamily: 'var(--font-syne, system-ui, sans-serif)',
                transition: 'font-size 0.1s, opacity 0.1s',
                pointerEvents: 'none',
              }}
            >
              {outOfRange ? null : fmt(v)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
