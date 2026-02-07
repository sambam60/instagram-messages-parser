'use client'

import React, { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Message } from '../types'

interface CalendarNavProps {
  messages: Message[]
  onSelectDate: (timestamp: number) => void
}

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function getMonday(d: Date): number {
  const day = d.getDay()
  return ((day + 6) % 7)
}

const CalendarNav: React.FC<CalendarNavProps> = ({ messages, onSelectDate }) => {
  const { dateCounts, firstTimestamps, maxDate } = useMemo(() => {
    const counts: Record<string, number> = {}
    const firsts: Record<string, number> = {}
    let max = -Infinity
    for (const msg of messages) {
      const d = new Date(msg.timestamp_ms)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      counts[key] = (counts[key] || 0) + 1
      if (!firsts[key] || msg.timestamp_ms < firsts[key]) {
        firsts[key] = msg.timestamp_ms
      }
      if (msg.timestamp_ms > max) max = msg.timestamp_ms
    }
    return { dateCounts: counts, firstTimestamps: firsts, maxDate: max }
  }, [messages])

  const maxCount = useMemo(() => {
    let m = 0
    for (const key in dateCounts) {
      if (dateCounts[key] > m) m = dateCounts[key]
    }
    return m
  }, [dateCounts])

  const initialDate = maxDate > 0 ? new Date(maxDate) : new Date()
  const [viewYear, setViewYear] = useState(initialDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth())

  const goToPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const goToNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    const startOffset = getMonday(firstDay)
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

    const days: Array<{ day: number; count: number; key: string } | null> = []

    for (let i = 0; i < startOffset; i++) {
      days.push(null)
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${viewYear}-${viewMonth}-${d}`
      days.push({ day: d, count: dateCounts[key] || 0, key })
    }

    return days
  }, [viewYear, viewMonth, dateCounts])

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  const handleDayClick = (key: string) => {
    const ts = firstTimestamps[key]
    if (ts) {
      onSelectDate(ts)
    }
  }

  const getIntensity = (count: number): string => {
    if (count === 0) return ''
    const ratio = count / maxCount
    if (ratio < 0.25) return 'bg-accent/20'
    if (ratio < 0.5) return 'bg-accent/40'
    if (ratio < 0.75) return 'bg-accent/60'
    return 'bg-accent/80'
  }

  return (
    <div className="w-72 p-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={goToPrev}
          className="p-1.5 rounded-lg hover:bg-surface-hover text-muted transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-foreground">{monthLabel}</span>
        <button
          onClick={goToNext}
          className="p-1.5 rounded-lg hover:bg-surface-hover text-muted transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-muted py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((cell, i) => {
          if (!cell) {
            return <div key={`blank-${i}`} className="w-9 h-9" />
          }

          const { day, count, key } = cell
          const hasMessages = count > 0
          const intensity = getIntensity(count)
          const today = new Date()
          const isToday =
            today.getFullYear() === viewYear &&
            today.getMonth() === viewMonth &&
            today.getDate() === day

          return (
            <button
              key={day}
              onClick={() => handleDayClick(key)}
              disabled={!hasMessages}
              title={hasMessages ? `${count} message${count !== 1 ? 's' : ''}` : 'No messages'}
              className={`
                w-9 h-9 rounded-lg flex items-center justify-center text-xs transition-all
                ${hasMessages
                  ? `cursor-pointer ${intensity} text-foreground font-medium hover:ring-2 hover:ring-accent active:scale-95`
                  : 'text-gray-400 dark:text-gray-500 cursor-default'
                }
                ${isToday ? 'ring-1 ring-accent' : ''}
              `}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3 px-1">
        <span className="text-[10px] text-muted">Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-surface-active" />
          <div className="w-3 h-3 rounded-sm bg-accent/20" />
          <div className="w-3 h-3 rounded-sm bg-accent/40" />
          <div className="w-3 h-3 rounded-sm bg-accent/60" />
          <div className="w-3 h-3 rounded-sm bg-accent/80" />
        </div>
        <span className="text-[10px] text-muted">More</span>
      </div>
    </div>
  )
}

export default CalendarNav
