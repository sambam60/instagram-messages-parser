'use client'

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { Message } from '../types'
import { decodeUnicode } from '../../lib/decodeUnicode'

interface MessagesViewProps {
  messages: Message[]
  scrollToTimestamp?: number | null
}

const REACTION_PATTERN = /(liked this message|reacted to|ಸಂದೇಶವನ್ನು\s+ಇಷ್ಟಪಟ್ಟಿದ್ದಾರೆ|ನಿಮ್ಮ\s+ಸಂದೇಶದ\s+ಗೆ)/i
const ATTACHMENT_PLACEHOLDER = /^(You sent an attachment\.|.+ sent an attachment\.)$/i
const WINDOW_SIZE = 400  // max messages in DOM
const LOAD_SIZE = 150    // how many to load at a time

const SENDER_COLORS = [
  '#e05252', '#d97706', '#059669', '#2563eb',
  '#7c3aed', '#db2777', '#0891b2', '#65a30d',
  '#ea580c', '#4f46e5', '#0d9488', '#c026d3',
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function getSenderColor(name: string): string {
  return SENDER_COLORS[hashString(name) % SENDER_COLORS.length]
}

function toDateKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isSameDay(ts1: number, ts2: number): boolean {
  return toDateKey(ts1) === toDateKey(ts2)
}

function prettifyLink(url: string): string {
  if (url.includes('/reel/')) return 'Instagram Reel'
  if (url.includes('/p/')) return 'Instagram Post'
  if (url.includes('/stories/')) return 'Instagram Story'
  if (url.includes('instagram.com')) return 'Instagram Link'
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return 'Link'
  }
}

const MessagesView: React.FC<MessagesViewProps> = ({ messages, scrollToTimestamp }) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const bottomSentinelRef = useRef<HTMLDivElement>(null)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const [showScrollUp, setShowScrollUp] = useState(false)
  const loadingRef = useRef(false)

  // Filter out reactions once
  const allMessages = useMemo(
    () => messages.filter(msg => !REACTION_PATTERN.test(decodeUnicode(msg.content || ''))),
    [messages]
  )

  // Sliding window: [winStart, winEnd) into allMessages
  const [winStart, setWinStart] = useState(0)
  const [winEnd, setWinEnd] = useState(0)

  const visibleMessages = useMemo(
    () => allMessages.slice(winStart, winEnd),
    [allMessages, winStart, winEnd]
  )

  const hasOlderMessages = winStart > 0
  const hasNewerMessages = winEnd < allMessages.length

  // Initialize window at the end of the conversation
  useEffect(() => {
    const total = allMessages.length
    const newEnd = total
    const newStart = Math.max(0, total - WINDOW_SIZE)
    setWinStart(newStart)
    setWinEnd(newEnd)

    // Scroll to bottom after render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      })
    })
  }, [allMessages])

  // Top sentinel: load older, trim newer
  useEffect(() => {
    const sentinel = topSentinelRef.current
    const container = scrollRef.current
    if (!sentinel || !container) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && winStart > 0 && !loadingRef.current) {
          loadingRef.current = true
          const prevHeight = container.scrollHeight
          const prevScroll = container.scrollTop

          setWinStart(prev => Math.max(0, prev - LOAD_SIZE))
          setWinEnd(prev => {
            const currentSize = prev - Math.max(0, winStart - LOAD_SIZE)
            // If window would exceed max, trim from end
            if (currentSize > WINDOW_SIZE) {
              return Math.max(0, winStart - LOAD_SIZE) + WINDOW_SIZE
            }
            return prev
          })

          requestAnimationFrame(() => {
            if (container) {
              const newHeight = container.scrollHeight
              container.scrollTop = prevScroll + (newHeight - prevHeight)
            }
            loadingRef.current = false
          })
        }
      },
      { root: container, rootMargin: '300px 0px 0px 0px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [winStart])

  // Bottom sentinel: load newer, trim older
  useEffect(() => {
    const sentinel = bottomSentinelRef.current
    const container = scrollRef.current
    if (!sentinel || !container) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && winEnd < allMessages.length && !loadingRef.current) {
          loadingRef.current = true

          setWinEnd(prev => Math.min(allMessages.length, prev + LOAD_SIZE))
          setWinStart(prev => {
            const newEnd = Math.min(allMessages.length, winEnd + LOAD_SIZE)
            const currentSize = newEnd - prev
            // If window would exceed max, trim from start
            if (currentSize > WINDOW_SIZE) {
              return newEnd - WINDOW_SIZE
            }
            return prev
          })

          requestAnimationFrame(() => {
            loadingRef.current = false
          })
        }
      },
      { root: container, rootMargin: '0px 0px 300px 0px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [winEnd, allMessages.length])

  // Calendar: jump to a date
  useEffect(() => {
    if (!scrollToTimestamp || !scrollRef.current) return

    const targetDateKey = toDateKey(scrollToTimestamp)
    const targetIdx = allMessages.findIndex(m => toDateKey(m.timestamp_ms) === targetDateKey)
    if (targetIdx === -1) return

    // Center the window around the target
    const halfWindow = Math.floor(WINDOW_SIZE / 2)
    const newStart = Math.max(0, targetIdx - halfWindow)
    const newEnd = Math.min(allMessages.length, newStart + WINDOW_SIZE)
    setWinStart(newStart)
    setWinEnd(newEnd)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          const target = scrollRef.current.querySelector(`[data-date="${targetDateKey}"]`)
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }
      })
    })
  }, [scrollToTimestamp, allMessages])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setShowScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 400)
    setShowScrollUp(el.scrollTop > 400)
  }, [])

  const scrollToBottom = () => {
    const total = allMessages.length
    setWinStart(Math.max(0, total - WINDOW_SIZE))
    setWinEnd(total)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      })
    })
  }

  const scrollToTop = () => {
    setWinStart(0)
    setWinEnd(Math.min(allMessages.length, WINDOW_SIZE))
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  const isConsecutive = (index: number) => {
    if (index === 0) return false
    const curr = visibleMessages[index]
    const prev = visibleMessages[index - 1]
    if (curr.sender_name !== prev.sender_name) return false
    if (curr.timestamp_ms - prev.timestamp_ms > 5 * 60 * 1000) return false
    return true
  }

  if (allMessages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        No messages to display
      </div>
    )
  }

  const windowInfo = (hasOlderMessages || hasNewerMessages)
    ? `${visibleMessages.length} of ${allMessages.length.toLocaleString()} loaded`
    : null

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-5 py-4"
      >
        {/* Top sentinel */}
        <div ref={topSentinelRef} className="h-1" />

        {hasOlderMessages && (
          <div className="text-center py-2">
            <span className="text-xs text-muted bg-surface rounded-full px-3 py-1">
              {winStart.toLocaleString()} older messages above
            </span>
          </div>
        )}

        {visibleMessages.map((message, index) => {
          const showSender = !isConsecutive(index)
          const showDate =
            index === 0 ||
            !isSameDay(message.timestamp_ms, visibleMessages[index - 1].timestamp_ms)
          const senderColor = getSenderColor(message.sender_name)
          const decodedContent = message.content ? decodeUnicode(message.content) : ''
          const isAttachmentPlaceholder = ATTACHMENT_PLACEHOLDER.test(decodedContent)
          const hasShare = message.share?.link

          return (
            <React.Fragment key={winStart + index}>
              {showDate && (
                <div
                  className="flex items-center justify-center my-6 first:mt-0"
                  data-date={toDateKey(message.timestamp_ms)}
                >
                  <div className="px-3 py-1 text-xs font-medium text-muted bg-surface rounded-full">
                    {formatDate(message.timestamp_ms)}
                  </div>
                </div>
              )}

              <div className={showSender && !showDate ? 'mt-4' : 'mt-0.5'}>
                {showSender && (
                  <div className="flex items-baseline gap-2 mb-0.5 pl-1">
                    <span className="text-xs font-semibold" style={{ color: senderColor }}>
                      {decodeUnicode(message.sender_name)}
                    </span>
                    <span className="text-[10px] text-muted">
                      {formatTime(message.timestamp_ms)}
                    </span>
                  </div>
                )}

                <div className="pl-1">
                  <div className="inline-block max-w-2xl px-3 py-1.5 rounded-2xl bg-received-bg text-received-text">
                    {hasShare && (
                      <a
                        href={message.share!.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-accent hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="break-all">
                          {prettifyLink(message.share!.link!)}
                          {message.share!.original_content_owner && (
                            <span className="text-muted"> @{message.share!.original_content_owner}</span>
                          )}
                        </span>
                      </a>
                    )}

                    {hasShare && message.share!.share_text && (
                      <p className="text-xs text-muted mt-1 break-words">
                        {decodeUnicode(message.share!.share_text)}
                      </p>
                    )}

                    {decodedContent && !(isAttachmentPlaceholder && hasShare) && (
                      <p className={`text-sm leading-relaxed break-words whitespace-pre-wrap ${hasShare ? 'mt-1' : ''}`}>
                        {decodedContent}
                      </p>
                    )}

                    {!decodedContent && !hasShare && !message.photos?.length && !message.videos?.length && !message.audio_files?.length && (
                      <p className="text-sm italic opacity-60">
                        [{message.type || 'unsupported'} message]
                      </p>
                    )}

                    {message.photos && message.photos.length > 0 && (
                      <div className={`${decodedContent || hasShare ? 'mt-1.5' : ''} space-y-1`}>
                        {message.photos.map((photo, i) => (
                          <img
                            key={i}
                            src={photo.uri}
                            alt={`Photo ${i + 1}`}
                            loading="lazy"
                            className="max-w-[300px] rounded-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {message.videos && message.videos.length > 0 && (
                      <div className={`${decodedContent || hasShare ? 'mt-1.5' : ''} space-y-1`}>
                        {message.videos.map((video, i) => (
                          <video key={i} controls src={video.uri} className="max-w-[300px] rounded-lg" />
                        ))}
                      </div>
                    )}

                    {message.audio_files && message.audio_files.length > 0 && (
                      <div className={`${decodedContent || hasShare ? 'mt-1.5' : ''} space-y-1`}>
                        {message.audio_files.map((audio, i) => (
                          <audio key={i} controls src={audio.uri} className="max-w-[260px]" />
                        ))}
                      </div>
                    )}
                  </div>

                  {isConsecutive(index) && (
                    <span className="ml-2 text-[10px] text-muted opacity-0 hover:opacity-100 transition-opacity inline-block align-bottom">
                      {formatTime(message.timestamp_ms)}
                    </span>
                  )}
                </div>
              </div>
            </React.Fragment>
          )
        })}

        {hasNewerMessages && (
          <div className="text-center py-2">
            <span className="text-xs text-muted bg-surface rounded-full px-3 py-1">
              {(allMessages.length - winEnd).toLocaleString()} newer messages below
            </span>
          </div>
        )}

        {/* Bottom sentinel */}
        <div ref={bottomSentinelRef} className="h-1" />
      </div>

      {/* Window info */}
      {windowInfo && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] text-muted bg-surface rounded-full shadow-sm pointer-events-none">
          {windowInfo}
        </div>
      )}

      {showScrollUp && (
        <button
          onClick={scrollToTop}
          className="absolute top-4 right-4 p-2 bg-surface text-muted rounded-full shadow-md hover:bg-surface-hover transition-colors"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      )}

      {showScrollDown && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 p-2 bg-surface text-muted rounded-full shadow-md hover:bg-surface-hover transition-colors"
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export default MessagesView
