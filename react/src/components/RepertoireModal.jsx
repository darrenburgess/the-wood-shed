import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import TagInput from './TagInput'

export default function RepertoireModal({ open, onClose, repertoireData, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    composer: '',
    url: '',
    tags: []
  })
  const [errors, setErrors] = useState({})
  const titleInputRef = useRef(null)

  // Reset form when opening/closing or when repertoireData changes
  useEffect(() => {
    if (open) {
      setErrors({}) // Clear errors when opening
      if (repertoireData) {
        // Edit mode - populate with existing data
        setFormData({
          title: repertoireData.title || '',
          composer: repertoireData.composer || '',
          url: repertoireData.url || '',
          tags: repertoireData.tags || []
        })
      } else {
        // Create mode - reset to defaults
        setFormData({
          title: '',
          composer: '',
          url: '',
          tags: []
        })
      }
      // Focus title input when modal opens
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
  }, [open, repertoireData])

  // Validate form
  const validateForm = () => {
    const newErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.composer.trim()) {
      newErrors.composer = 'Composer is required'
    }

    // URL is optional, but if provided, must be valid
    if (formData.url.trim()) {
      try {
        new URL(formData.url)
      } catch {
        newErrors.url = 'Please enter a valid URL'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    if (!validateForm()) {
      return
    }

    const dataToSave = {
      ...formData,
      tags: formData.tags // Already an array from TagInput
    }

    // If editing, include the ID
    if (repertoireData?.id) {
      dataToSave.id = repertoireData.id
    }

    onSave(dataToSave)
    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {repertoireData ? 'Edit Repertoire' : 'Add Repertoire'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title Field */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              ref={titleInputRef}
              id="title"
              placeholder="Enter piece title..."
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={errors.title ? 'border-red-500 focus:ring-red-500' : ''}
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? 'title-error' : undefined}
            />
            {errors.title && (
              <p id="title-error" className="text-sm text-red-600" role="alert">
                {errors.title}
              </p>
            )}
          </div>

          {/* Composer Field */}
          <div className="space-y-2">
            <label htmlFor="composer" className="text-sm font-medium text-gray-700">
              Composer <span className="text-red-500">*</span>
            </label>
            <Input
              id="composer"
              placeholder="Enter composer name..."
              value={formData.composer}
              onChange={(e) => handleInputChange('composer', e.target.value)}
              className={errors.composer ? 'border-red-500 focus:ring-red-500' : ''}
              aria-invalid={!!errors.composer}
              aria-describedby={errors.composer ? 'composer-error' : undefined}
            />
            {errors.composer && (
              <p id="composer-error" className="text-sm text-red-600" role="alert">
                {errors.composer}
              </p>
            )}
          </div>

          {/* URL Field */}
          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-medium text-gray-700">
              URL (optional)
            </label>
            <Input
              id="url"
              type="url"
              placeholder="https://..."
              value={formData.url}
              onChange={(e) => handleInputChange('url', e.target.value)}
              className={errors.url ? 'border-red-500 focus:ring-red-500' : ''}
              aria-invalid={!!errors.url}
              aria-describedby={errors.url ? 'url-error' : undefined}
            />
            {errors.url && (
              <p id="url-error" className="text-sm text-red-600" role="alert">
                {errors.url}
              </p>
            )}
          </div>

          {/* Tags Field */}
          <div className="space-y-2">
            <label htmlFor="tags" className="text-sm font-medium">
              Tags
            </label>
            <TagInput
              value={formData.tags}
              onChange={(tags) => handleInputChange('tags', tags)}
            />
            <p className="text-xs text-gray-500">
              Type to search existing tags or create new ones
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary-600 hover:bg-primary-700"
          >
            {repertoireData ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
