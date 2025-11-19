import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ExternalLink, Music } from 'lucide-react'

/**
 * ContentChipPopover - Interactive popover for content chips
 * Shows content details, allows tempo editing, opening content, and removal
 */
export default function ContentChipPopover({
  content,
  isOpen,
  onToggle,
  onSaveTempo,
  onOpenContent,
  onRemove, // Optional - only provided for log-level content chips
  className = ''
}) {
  const [tempo, setTempo] = useState('')
  const [saving, setSaving] = useState(false)

  // Initialize tempo from content when popover opens
  useEffect(() => {
    if (isOpen && content) {
      setTempo(content.tempo || '')
    }
  }, [isOpen, content])

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSaveTempo(content.id, tempo)
    } finally {
      setSaving(false)
    }
  }

  const handleOpen = () => {
    onOpenContent(content)
    onToggle() // Close popover after opening content
  }

  const handleRemove = () => {
    if (onRemove) {
      onRemove(content.id)
      onToggle() // Close popover after removing
    }
  }

  return (
    <div className="relative inline-block">
      {/* Content Chip Badge */}
      <Badge
        className={`bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200 ${className}`}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
      >
        {content.title}
      </Badge>

      {/* Popover */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 z-50 bg-white shadow-lg border border-gray-200 rounded-lg p-4 w-80"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title */}
          <h4 className="text-sm font-semibold text-gray-900 mb-3">{content.title}</h4>

          {/* Tempo Field */}
          <div className="space-y-2 mb-3">
            <label htmlFor={`tempo-${content.id}`} className="text-xs font-medium text-gray-700 flex items-center gap-1">
              <Music className="w-3 h-3" />
              Tempo
            </label>
            <Input
              id={`tempo-${content.id}`}
              type="text"
              placeholder="e.g., Andante, 120 BPM..."
              value={tempo}
              onChange={(e) => setTempo(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {/* Save Tempo */}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-primary-600 hover:bg-primary-700"
            >
              {saving ? 'Saving...' : 'Save Tempo'}
            </Button>

            {/* Open Content */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpen}
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Content
            </Button>

            {/* Remove (only shown for log-level chips) */}
            {onRemove && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleRemove}
                className="w-full"
              >
                Remove from Log
              </Button>
            )}

            {/* Close */}
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggle}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
