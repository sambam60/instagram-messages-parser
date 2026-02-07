'use client'

import React, { useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { Conversation } from '../types'

interface UploadFormProps {
  onUploadSuccess: (conversations: Conversation[]) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  compact?: boolean
}

const UploadForm: React.FC<UploadFormProps> = ({ onUploadSuccess, isLoading, setIsLoading, compact = false }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string>('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    const file = e.target.files?.[0] || null
    setSelectedFile(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile) {
      setError('Please select a ZIP file.')
      return
    }

    if (!selectedFile.name.endsWith('.zip')) {
      setError('Please upload a valid ZIP file.')
      return
    }

    setIsLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let done = false
      let partialData = ''

      while (reader && !done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (value) {
          partialData += decoder.decode(value)
          try {
            const parsed = JSON.parse(partialData)
            if (parsed.conversations) {
              onUploadSuccess(parsed.conversations)
              setSelectedFile(null)
              partialData = ''
            }
          } catch {
            // JSON not complete yet, continue reading
          }
        }
      }
    } catch {
      setError('Upload failed. Please try again.')
      setIsLoading(false)
    }
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <label
          htmlFor="fileInputCompact"
          className="flex-1 flex items-center gap-2 px-3 py-2 text-xs text-muted bg-surface-hover rounded-lg cursor-pointer hover:bg-surface-active transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          {selectedFile ? selectedFile.name : 'Add another ZIP...'}
        </label>
        <input
          id="fileInputCompact"
          type="file"
          accept=".zip"
          className="hidden"
          onChange={handleFileChange}
        />
        {selectedFile && (
          <button
            type="submit"
            disabled={isLoading}
            className="px-3 py-2 text-xs font-medium bg-accent text-white rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Parse'}
          </button>
        )}
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label
        htmlFor="fileInput"
        className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-muted hover:bg-surface transition-colors"
      >
        <Upload className="w-6 h-6 text-muted" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {selectedFile ? selectedFile.name : 'Choose ZIP file'}
          </p>
          <p className="text-xs text-muted mt-0.5">Instagram data export</p>
        </div>
      </label>
      <input
        id="fileInput"
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={!selectedFile || isLoading}
        className="w-full py-2.5 text-sm font-medium bg-accent text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Parsing...
          </>
        ) : (
          'Parse ZIP'
        )}
      </button>
    </form>
  )
}

export default UploadForm
