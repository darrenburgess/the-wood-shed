import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import TagInput from './TagInput'
import { ConfirmDialog } from './ConfirmDialog'

export default function ContentModal({ open, onClose, contentData, onSave, onDelete }) {
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    type: 'youtube',
    tempo: '',
    tags: []
  })
  const [errors, setErrors] = useState({})
  const titleInputRef = useRef(null)

  // Reset form when opening/closing or when contentData changes
  useEffect(() => {
    if (open) {
      setErrors({}) // Clear errors when opening
      if (contentData) {
        // Edit mode - populate with existing data
        setFormData({
          title: contentData.title || '',
          url: contentData.url || '',
          type: contentData.type || 'youtube',
          tempo: contentData.tempo || '',
          tags: contentData.tags || []
        })
      } else {
        // Create mode - reset to defaults
        setFormData({
          title: '',
          url: '',
          type: 'youtube',
          tempo: '',
          tags: []
        })
      }
      // Focus title input when modal opens
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
  }, [open, contentData])

  // Validate form
  const validateForm = () => {
    const newErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.url.trim()) {
      newErrors.url = 'URL is required'
    } else {
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
    if (contentData?.id) {
      dataToSave.id = contentData.id
    }

    onSave(dataToSave)
    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  const handleDelete = () => {
    onDelete(contentData.id)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {contentData ? 'Edit Content' : 'Add Content'}
          </DialogTitle>
          <DialogDescription>
            {contentData ? 'Update the details for this content item.' : 'Add a new learning resource to your library.'}
          </DialogDescription>
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
              placeholder="Enter content title..."
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

          {/* URL Field */}
          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-medium text-gray-700">
              URL <span className="text-red-500">*</span>
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

          {/* Type Field */}
          <div className="space-y-2">
            <label htmlFor="type" className="text-sm font-medium">
              Type
            </label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleInputChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">▶️ YouTube</SelectItem>
                <SelectItem value="article">📄 Article</SelectItem>
                <SelectItem value="video">🎬 Video</SelectItem>
                <SelectItem value="pdf">📕 PDF</SelectItem>
                <SelectItem value="image">🖼️ Image</SelectItem>
                <SelectItem value="other">🔗 Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tempo Field */}
          <div className="space-y-2">
            <label htmlFor="tempo" className="text-sm font-medium text-gray-700">
              Tempo
            </label>
            <Input
              id="tempo"
              placeholder="e.g., Andante, 120 BPM, Slow..."
              value={formData.tempo}
              onChange={(e) => handleInputChange('tempo', e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Optional: Specify the tempo or speed for this content
            </p>
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

        <DialogFooter className="flex justify-between items-center">
          {contentData && (
            <ConfirmDialog
              title="Delete Content?"
              description={`This will permanently delete "${formData.title}". This action cannot be undone.`}
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
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-primary-600 hover:bg-primary-700"
            >
              {contentData ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
