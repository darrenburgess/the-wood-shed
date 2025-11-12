import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog } from './ConfirmDialog'

export default function LogModal({ open, onClose, logData, onSave, onDelete }) {
  const [entry, setEntry] = useState('')
  const [date, setDate] = useState('')
  const [error, setError] = useState('')
  const entryRef = useRef(null)

  // Reset form when opening/closing or when logData changes
  useEffect(() => {
    if (open && logData) {
      setError('')
      setEntry(logData.entry || '')
      setDate(logData.date || new Date().toISOString().split('T')[0])
      // Focus entry input when modal opens
      setTimeout(() => entryRef.current?.focus(), 100)
    }
  }, [open, logData])

  const handleSave = () => {
    if (!entry.trim()) {
      setError('Entry is required')
      return
    }

    const updateData = {
      entry: entry.trim(),
      date
    }

    onSave(logData.id, updateData)
    onClose()
  }

  const handleDelete = () => {
    onDelete(logData.id)
    onClose()
  }

  if (!logData) return null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Log</DialogTitle>
          <DialogDescription>
            Update the log entry or date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Entry Field */}
          <div className="space-y-2">
            <label htmlFor="entry" className="text-sm font-medium text-gray-700">
              Entry <span className="text-red-500">*</span>
            </label>
            <Textarea
              ref={entryRef}
              id="entry"
              placeholder="Log your progress..."
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              rows={4}
              className={error ? 'border-red-500 focus:ring-red-500' : ''}
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* Date Field */}
          <div className="space-y-2">
            <label htmlFor="date" className="text-sm font-medium text-gray-700">
              Date
            </label>
            <Input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center">
          <ConfirmDialog
            title="Delete Log?"
            description="This will permanently delete this practice log. This action cannot be undone."
            confirmText="Delete"
            onConfirm={handleDelete}
            variant="destructive"
          >
            <Button
              variant="destructive"
              className="mr-auto"
            >
              Delete
            </Button>
          </ConfirmDialog>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-primary-600 hover:bg-primary-700"
            >
              Update
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
