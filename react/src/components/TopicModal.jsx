import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

export default function TopicModal({ open, onClose, topicData, onSave, onDelete }) {
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const titleRef = useRef(null)

  // Reset form when opening/closing or when topicData changes
  useEffect(() => {
    if (open) {
      setError('')
      if (topicData) {
        // Edit mode
        setTitle(topicData.title || '')
      } else {
        // Create mode
        setTitle('')
      }
      // Focus title input when modal opens
      setTimeout(() => titleRef.current?.focus(), 100)
    }
  }, [open, topicData])

  const handleSave = () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    onSave(title.trim())
    onClose()
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this topic and ALL its goals and logs?')) {
      onDelete(topicData.id)
      onClose()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {topicData ? 'Edit Topic' : 'New Topic'}
          </DialogTitle>
          <DialogDescription>
            {topicData
              ? 'Update the topic title. Deleting will remove all goals and logs.'
              : 'Create a new topic to organize your practice goals.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Textarea
            ref={titleRef}
            placeholder="Topic title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            className={error ? 'border-red-500 focus:ring-red-500' : ''}
          />
          {error && (
            <p className="text-sm text-red-600 mt-1">{error}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Press Enter to save, Shift+Enter for new line
          </p>
        </div>

        <DialogFooter className="flex justify-between items-center">
          {topicData && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="mr-auto"
            >
              Delete
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-primary-600 hover:bg-primary-700"
            >
              {topicData ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
