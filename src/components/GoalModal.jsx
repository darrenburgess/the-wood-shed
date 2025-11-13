import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog } from './ConfirmDialog'
import { getTodayDateET } from '@/lib/dateUtils'

export default function GoalModal({ open, onClose, goalData, onSave, onDelete }) {
  const [description, setDescription] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState('')
  const descriptionRef = useRef(null)

  // Reset form when opening/closing or when goalData changes
  useEffect(() => {
    if (open && goalData) {
      setError('')
      setDescription(goalData.description || '')
      setIsComplete(goalData.is_complete || false)
      // Focus description input when modal opens
      setTimeout(() => descriptionRef.current?.focus(), 100)
    }
  }, [open, goalData])

  const handleSave = () => {
    if (!description.trim()) {
      setError('Description is required')
      return
    }

    const updateData = {
      description: description.trim(),
      is_complete: isComplete,
      date_completed: isComplete ? (goalData.date_completed || getTodayDateET()) : null
    }

    onSave(goalData.id, updateData)
    onClose()
  }

  const handleDelete = () => {
    onDelete(goalData.id)
    onClose()
  }

  if (!goalData) return null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Goal</DialogTitle>
          <DialogDescription>
            Update the goal description or mark it as complete.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Description Field */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <Textarea
              ref={descriptionRef}
              id="description"
              placeholder="Goal description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={error ? 'border-red-500 focus:ring-red-500' : ''}
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* Completion Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isComplete"
              checked={isComplete}
              onChange={(e) => setIsComplete(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isComplete" className="text-sm font-medium text-gray-700">
              Mark as complete
            </label>
          </div>

          {isComplete && goalData.date_completed && (
            <p className="text-xs text-gray-500">
              Completed: {new Date(goalData.date_completed).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          )}
        </div>

        <DialogFooter className="flex justify-between items-center">
          <ConfirmDialog
            title="Delete Goal?"
            description="This will permanently delete this goal and all its logs. This action cannot be undone."
            confirmText="Delete Goal"
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
