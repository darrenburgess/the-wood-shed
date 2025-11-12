import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import TagInput from './TagInput'

export default function ContentModal({ open, onClose, contentData, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    type: 'youtube',
    tags: []
  })

  // Reset form when opening/closing or when contentData changes
  useEffect(() => {
    if (open) {
      if (contentData) {
        // Edit mode - populate with existing data
        setFormData({
          title: contentData.title || '',
          url: contentData.url || '',
          type: contentData.type || 'youtube',
          tags: contentData.tags || []
        })
      } else {
        // Create mode - reset to defaults
        setFormData({
          title: '',
          url: '',
          type: 'youtube',
          tags: []
        })
      }
    }
  }, [open, contentData])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
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

  const isFormValid = formData.title.trim() !== '' && formData.url.trim() !== ''

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {contentData ? 'Edit Content' : 'Add Content'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title Field */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="title"
              placeholder="Enter content title..."
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
            />
          </div>

          {/* URL Field */}
          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-medium">
              URL <span className="text-red-500">*</span>
            </label>
            <Input
              id="url"
              type="url"
              placeholder="https://..."
              value={formData.url}
              onChange={(e) => handleInputChange('url', e.target.value)}
            />
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
            disabled={!isFormValid}
            className="bg-primary-600 hover:bg-primary-700"
          >
            {contentData ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
