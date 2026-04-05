import { useState, useRef, useEffect } from 'react'
import { formatTimecode } from '../../utils/formatTime'
import { parseTimecode } from '../../utils/parseTimecode'
import { TimelineStrings } from '../../constants/ui'

interface TimecodeInputProps {
  currentTime: number
  duration: number
  onSeek: (time: number) => void
}

export function TimecodeInput({ currentTime, duration, onSeek }: TimecodeInputProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setValue(formatTimecode(currentTime))
    setEditing(true)
  }

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const commit = () => {
    const parsed = parseTimecode(value)
    if (parsed !== null) {
      onSeek(Math.max(0, Math.min(duration, parsed)))
    }
    setEditing(false)
  }

  const cancel = () => setEditing(false)

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { e.preventDefault(); cancel() }
        }}
        onBlur={commit}
        className="font-mono text-xs tablet:text-sm text-fg-1 bg-transparent border-b border-accent w-[5.5rem] text-right outline-none tabular-nums"
        placeholder={TimelineStrings.timecodePlaceholder}
        aria-label={TimelineStrings.timecodeInputAriaLabel}
        autoComplete="off"
        spellCheck={false}
      />
    )
  }

  return (
    <button
      onClick={startEdit}
      className="font-mono text-xs tablet:text-sm text-fg-muted hover:text-fg-1 tabular-nums cursor-text transition-colors"
      title={TimelineStrings.timecodeTitle}
      aria-label={TimelineStrings.timecodeAriaLabel(formatTimecode(currentTime))}
    >
      {formatTimecode(currentTime)}
    </button>
  )
}
