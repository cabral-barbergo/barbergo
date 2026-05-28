'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const ITEM_H = 48   // px per row
const HALF   = 2    // visible rows above/below center
const BUFFER = 4    // extra rows generated beyond visible half (allows 4-step drag)

const CENTER_IDX  = HALF + BUFFER          // index of current value in items array
const TOTAL_ITEMS = CENTER_IDX * 2 + 1    // 13 items rendered
const BASE_TY     = -((CENTER_IDX - HALF) * ITEM_H)  // translateY that centers the picker
const CONTAINER_H = (HALF * 2 + 1) * ITEM_H          // 5 * 48 = 240px

interface Props {
  value: number
  onChange: (v: number) => void
  step: number
  min: number
  max?: number
  format?: (v: number) => string
}

export default function DrumPicker({ value, onChange, step, min, max, format }: Props) {
  // Internal value tracks rapid changes (wheel, multi-step drag) without waiting for props
  const [internal, setInternal] = useState(value)
  const [offset,   setOffset]   = useState(0)
  const dragging   = useRef(false)
  const startY     = useRef(0)
  const curOffset  = useRef(0)

  // Keep internal in sync when parent changes value externally
  useEffect(() => {
    if (!dragging.current) setInternal(value)
  }, [value])

  const clamp = useCallback((v: number) => {
    const lo = min
    const hi = max !== undefined ? max : Infinity
    return Math.max(lo, Math.min(hi, v))
  }, [min, max])

  const fmt = format ?? ((v: number) => String(v))

  const items = Array.from({ length: TOTAL_ITEMS }, (_, i) => {
    const stepsFromCenter = i - CENTER_IDX
    return internal + stepsFromCenter * step
  })

  function commit(pixelOffset: number) {
    const steps = -Math.round(pixelOffset / ITEM_H)
    if (steps !== 0) {
      const next = clamp(internal + steps * step)
      setInternal(next)
      onChange(next)
    }
    setOffset(0)
    curOffset.current = 0
  }

  // ── Touch ─────────────────────────────────────────────────────────
  function onTouchStart(e: React.TouchEvent) {
    dragging.current = true
    startY.current   = e.touches[0].clientY
    curOffset.current = 0
    setOffset(0)
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!dragging.current) return
    const delta = e.touches[0].clientY - startY.current
    curOffset.current = delta
    setOffset(delta)
  }
  function onTouchEnd() {
    if (!dragging.current) return
    dragging.current = false
    commit(curOffset.current)
  }

  // ── Mouse ─────────────────────────────────────────────────────────
  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true
    startY.current   = e.clientY
    curOffset.current = 0
    setOffset(0)
    e.preventDefault()
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return
    const delta = e.clientY - startY.current
    curOffset.current = delta
    setOffset(delta)
  }
  function onMouseUp() {
    if (!dragging.current) return
    dragging.current = false
    commit(curOffset.current)
  }

  // ── Wheel ─────────────────────────────────────────────────────────
  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    const next = clamp(internal - Math.sign(e.deltaY) * step)
    setInternal(next)
    onChange(next)
  }

  return (
    <div
      style={{ position: 'relative', height: CONTAINER_H, width: 160, overflow: 'hidden', userSelect: 'none', touchAction: 'none' }}
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
      <div style={{
        position: 'absolute', top: HALF * ITEM_H, left: 0, right: 0, height: ITEM_H,
        background: 'rgba(200,169,126,0.08)',
        borderTop: '1px solid rgba(200,169,126,0.25)',
        borderBottom: '1px solid rgba(200,169,126,0.25)',
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* Top fade */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: HALF * ITEM_H,
        background: 'linear-gradient(to bottom, #111 0%, transparent 100%)',
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* Bottom fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: HALF * ITEM_H,
        background: 'linear-gradient(to top, #111 0%, transparent 100%)',
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* Scrollable list */}
      <div style={{
        transform: `translateY(${BASE_TY + offset}px)`,
        transition: dragging.current ? 'none' : 'transform 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        willChange: 'transform',
        cursor: dragging.current ? 'grabbing' : 'grab',
      }}>
        {items.map((v, i) => {
          const dist       = Math.abs(i - CENTER_IDX)
          const isCenter   = dist === 0
          const outOfRange = v < min || (max !== undefined && v > max)

          const opacity    = outOfRange ? 0.06  : isCenter ? 1    : dist === 1 ? 0.45  : 0.18
          const fontSize   = outOfRange ? '0rem': isCenter ? '1.45rem' : dist === 1 ? '1rem' : '0.8rem'
          const fontWeight = isCenter ? 700 : dist === 1 ? 500 : 400
          const color      = outOfRange ? 'transparent' : isCenter ? '#c8a97e' : '#888'

          return (
            <div
              key={i}
              style={{
                height: ITEM_H,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize,
                fontWeight,
                color,
                opacity,
                fontFamily: 'var(--font-syne, system-ui, sans-serif)',
                transition: 'font-size 0.12s, opacity 0.12s',
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
