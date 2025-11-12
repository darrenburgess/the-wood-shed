import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { searchTags } from '@/lib/queries'

export default function TagInput({ value = [], onChange }) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)

  // Search for tag suggestions as user types
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (inputValue.trim().length === 0) {
        setSuggestions([])
        setShowSuggestions(false)
        return
      }

      try {
        const results = await searchTags(inputValue)
        // Filter out tags that are already selected
        const filtered = results.filter(tag => !value.includes(tag.name))
        setSuggestions(filtered)
        setShowSuggestions(filtered.length > 0)
        setSelectedIndex(-1)
      } catch (err) {
        console.error('Error fetching tag suggestions:', err)
        setSuggestions([])
      }
    }

    const timeoutId = setTimeout(fetchSuggestions, 200)
    return () => clearTimeout(timeoutId)
  }, [inputValue, value])

  // Add tag to the list
  const addTag = (tagName) => {
    const normalized = tagName.toLowerCase().trim()
    if (normalized && !value.includes(normalized)) {
      onChange([...value, normalized])
    }
    setInputValue('')
    setSuggestions([])
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }

  // Remove tag from the list
  const removeTag = (tagToRemove) => {
    onChange(value.filter(tag => tag !== tagToRemove))
  }

  // Handle keyboard events
  const handleKeyDown = (e) => {
    // Enter or comma: add tag
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        addTag(suggestions[selectedIndex].name)
      } else if (inputValue.trim()) {
        addTag(inputValue)
      }
    }
    // Backspace on empty input: remove last tag
    else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      removeTag(value[value.length - 1])
    }
    // Arrow down: navigate suggestions
    else if (e.key === 'ArrowDown' && showSuggestions) {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
    }
    // Arrow up: navigate suggestions
    else if (e.key === 'ArrowUp' && showSuggestions) {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, -1))
    }
    // Escape: close suggestions
    else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }
  }

  return (
    <div className="relative">
      {/* Selected tags */}
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag) => (
          <Badge
            key={tag}
            variant="default"
            className="bg-primary-600 hover:bg-primary-700 cursor-pointer"
            onClick={() => removeTag(tag)}
          >
            {tag}
            <span className="ml-1 font-bold">×</span>
          </Badge>
        ))}
      </div>

      {/* Input field */}
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => inputValue && setShowSuggestions(suggestions.length > 0)}
        onBlur={() => {
          // Delay hiding suggestions to allow clicking on them
          setTimeout(() => setShowSuggestions(false), 200)
        }}
        placeholder="Type to add tags (comma or enter to add)..."
      />

      {/* Autocomplete suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {suggestions.map((tag, index) => (
            <div
              key={tag.id}
              className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                index === selectedIndex ? 'bg-gray-100' : ''
              }`}
              onClick={() => addTag(tag.name)}
            >
              {tag.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
