'use client'

import React from 'react'
import { Conversation } from '../types'
import { decodeUnicode } from '../../lib/decodeUnicode'

interface ConversationsListProps {
  conversations: Conversation[]
  onSelectConversation: (conversation: Conversation) => void
  selectedConversation: Conversation | null
}

const REACTION_PATTERN = /(liked this message|reacted to|ಸಂದೇಶವನ್ನು\s+ಇಷ್ಟಪಟ್ಟಿದ್ದಾರೆ|ನಿಮ್ಮ\s+ಸಂದೇಶದ\s+ಗೆ)/i

const ConversationsList: React.FC<ConversationsListProps> = ({
  conversations = [],
  onSelectConversation,
  selectedConversation,
}) => {
  return (
    <div className="py-1">
      {conversations.map((conversation, index) => {
        const nonReactionMessages = conversation.messages.filter(
          msg => !REACTION_PATTERN.test(decodeUnicode(msg.content || ''))
        )
        const lastMessage = nonReactionMessages[nonReactionMessages.length - 1] || null
        const isSelected = selectedConversation?.thread_path === conversation.thread_path
        const title = conversation.title
          ? decodeUnicode(conversation.title)
          : conversation.participants?.map(p => p.name).join(', ')
        const initial = title ? title[0].toUpperCase() : '?'
        const messageCount = conversation.messages.length

        return (
          <button
            key={conversation.thread_path || index}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              isSelected
                ? 'bg-accent-light'
                : 'hover:bg-surface-hover'
            }`}
            onClick={() => onSelectConversation(conversation)}
          >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold ${
              isSelected
                ? 'bg-accent text-white'
                : 'bg-surface-active text-muted'
            }`}>
              {initial}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium truncate text-foreground">
                  {title}
                </p>
                {lastMessage && (
                  <span className="flex-shrink-0 text-[11px] text-muted">
                    {new Date(lastMessage.timestamp_ms).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="text-xs text-muted truncate">
                  {lastMessage
                    ? decodeUnicode(lastMessage.content || `[${lastMessage.type || 'media'}]`)
                    : 'No messages'}
                </p>
                <span className="flex-shrink-0 text-[10px] text-muted bg-surface-active rounded-full px-1.5 py-0.5">
                  {messageCount.toLocaleString()}
                </span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default ConversationsList
