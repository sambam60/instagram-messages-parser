'use client'

import React, { useState, useRef } from 'react'
import UploadForm from './components/UploadForm'
import ConversationsList from './components/ConversationsList'
import MessagesView from './components/MessagesView'
import CalendarNav from './components/CalendarNav'
import { Conversation } from './types'
import { decodeUnicode } from '../lib/decodeUnicode'
import DarkModeToggle from './components/DarkModeToggle'
import { Search, MessageCircle, Users, Calendar } from 'lucide-react'

const HomePage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [searchConvo, setSearchConvo] = useState<string>('')
  const [searchMessage, setSearchMessage] = useState<string>('')
  const [showMessageSearch, setShowMessageSearch] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [scrollToTimestamp, setScrollToTimestamp] = useState<number | null>(null)
  const scrollCounter = useRef(0)

  const handleUploadSuccess = (uploadedConversations: Conversation[]) => {
    setConversations(prev => [...prev, ...uploadedConversations])
    setIsLoading(false)
  }

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setSearchMessage('')
    setShowMessageSearch(false)
    setShowCalendar(false)
    setScrollToTimestamp(null)
  }

  const handleCalendarDateSelect = (timestamp: number) => {
    // Add a tiny offset each time so even clicking the same date triggers a new effect
    scrollCounter.current += 1
    setScrollToTimestamp(timestamp + scrollCounter.current * 0.001)
  }

  const filteredConversations = conversations.filter(conv =>
    decodeUnicode(conv.title).toLowerCase().includes(searchConvo.toLowerCase())
  )

  const filteredMessages = selectedConversation
    ? selectedConversation.messages.filter(msg =>
        searchMessage
          ? decodeUnicode(msg.content || '').toLowerCase().includes(searchMessage.toLowerCase())
          : true
      )
    : []

  const hasConversations = conversations.length > 0

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <div className="w-80 min-w-[320px] border-r border-border flex flex-col bg-background">
        {/* Sidebar header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold tracking-tight">Messages</h1>
            <DarkModeToggle />
          </div>
          {!hasConversations ? (
            <UploadForm
              onUploadSuccess={handleUploadSuccess}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchConvo}
                onChange={(e) => setSearchConvo(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-input-bg text-foreground rounded-lg border-none placeholder:text-muted"
              />
            </div>
          )}
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {hasConversations ? (
            <ConversationsList
              conversations={filteredConversations}
              onSelectConversation={handleSelectConversation}
              selectedConversation={selectedConversation}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted px-8 text-center">
              <MessageCircle className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Upload your Instagram data export ZIP to get started</p>
            </div>
          )}
        </div>

        {/* Upload another file when conversations exist */}
        {hasConversations && (
          <div className="p-3 border-t border-border">
            <UploadForm
              onUploadSuccess={handleUploadSuccess}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              compact
            />
          </div>
        )}
      </div>

      {/* Main conversation view */}
      <div className="flex-1 flex flex-col bg-background min-w-0">
        {selectedConversation ? (
          <>
            {/* Conversation header */}
            <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold truncate">
                  {decodeUnicode(selectedConversation.title)}
                </h2>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Users className="w-3 h-3" />
                  <span>{selectedConversation.participants.length} participants</span>
                  <span className="text-border">|</span>
                  <span>{selectedConversation.messages.length.toLocaleString()} messages</span>
                  {searchMessage && (
                    <>
                      <span className="text-border">|</span>
                      <span className="text-accent">{filteredMessages.length.toLocaleString()} matches</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {showMessageSearch && (
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={searchMessage}
                    onChange={(e) => setSearchMessage(e.target.value)}
                    autoFocus
                    className="w-56 px-3 py-1.5 text-sm bg-input-bg text-foreground rounded-lg border-none placeholder:text-muted"
                  />
                )}
                <button
                  onClick={() => {
                    setShowMessageSearch(!showMessageSearch)
                    if (showMessageSearch) setSearchMessage('')
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    showMessageSearch ? 'bg-accent-light text-accent' : 'hover:bg-surface-hover text-muted'
                  }`}
                  aria-label="Search messages"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className={`p-2 rounded-lg transition-colors ${
                    showCalendar ? 'bg-accent-light text-accent' : 'hover:bg-surface-hover text-muted'
                  }`}
                  aria-label="Calendar navigation"
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar panel (slides down below header) */}
            {showCalendar && (
              <div className="border-b border-border bg-background flex justify-center">
                <CalendarNav
                  messages={selectedConversation.messages}
                  onSelectDate={handleCalendarDateSelect}
                />
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-hidden">
              <MessagesView
                messages={filteredMessages}
                scrollToTimestamp={scrollToTimestamp}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted">
            <MessageCircle className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-base">Select a conversation to view messages</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default HomePage
