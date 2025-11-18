import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pencil, ChevronUp, ChevronDown, Info } from 'lucide-react'
import ContentModal from './ContentModal'
import YouTubeModal from './YouTubeModal'
import { fetchContent, createContent, updateContent, deleteContent, fetchLogsForContent } from '@/lib/queries'

export default function ContentTab() {
  // State management
  const [content, setContent] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingContent, setEditingContent] = useState(null)
  const [error, setError] = useState(null)
  const [youtubeModalOpen, setYoutubeModalOpen] = useState(false)
  const [selectedYoutubeContent, setSelectedYoutubeContent] = useState(null)
  const [sortField, setSortField] = useState('title')
  const [sortDirection, setSortDirection] = useState('asc')
  const [practiceHistoryPopover, setPracticeHistoryPopover] = useState({ open: false, contentId: null, logs: [], loading: false, openAbove: false })

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Helper function to format log entry for display
  const formatLogEntry = (log) => {
    const date = new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })

    // Handle nested goal and topic data - Supabase returns nested objects
    const goal = log.goals
    const topicTitle = goal?.topics?.title || 'No Topic'
    const goalTitle = goal?.description || 'Unassigned'
    const logDescription = log.entry || 'No description'

    return {
      date,
      topicTitle,
      goalTitle,
      logDescription
    }
  }

  // Handle practice history popover
  const handleTogglePracticeHistory = async (e, contentId) => {
    e.stopPropagation()

    // If clicking the same content, close it
    if (practiceHistoryPopover.open && practiceHistoryPopover.contentId === contentId) {
      setPracticeHistoryPopover({ open: false, contentId: null, logs: [], loading: false, openAbove: false })
      return
    }

    // Check if we should open above or below
    const rect = e.currentTarget.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const spaceBelow = viewportHeight - rect.bottom
    const openAbove = spaceBelow < 400 // If less than 400px below, open above

    // Open popover and load logs
    setPracticeHistoryPopover({ open: true, contentId, logs: [], loading: true, openAbove })
    const logs = await fetchLogsForContent(contentId, 50) // Reasonable limit
    setPracticeHistoryPopover({ open: true, contentId, logs, loading: false, openAbove })
  }

  const handleClosePracticeHistory = () => {
    setPracticeHistoryPopover({ open: false, contentId: null, logs: [], loading: false, openAbove: false })
  }

  // Helper function to truncate URL
  const truncateUrl = (url, maxLength = 30) => {
    if (url.length <= maxLength) return url
    return url.substring(0, maxLength) + '...'
  }

  // Helper function to get type icon
  const getTypeIcon = (type) => {
    switch (type) {
      case 'youtube':
        return '▶️'
      case 'article':
        return '📄'
      case 'video':
        return '🎬'
      case 'pdf':
        return '📕'
      default:
        return '🔗'
    }
  }

  // Helper function to check if URL is YouTube
  const isYouTubeUrl = (url) => {
    try {
      const urlObj = new URL(url)
      const isYouTubeDomain = urlObj.hostname.includes('youtube.com') || urlObj.hostname === 'youtu.be'
      return isYouTubeDomain
    } catch {
      return false
    }
  }

  // Handle YouTube link click
  const handleYouTubeLinkClick = (e, item) => {
    e.preventDefault()
    setSelectedYoutubeContent(item)
    setYoutubeModalOpen(true)
  }

  // Extract unique tags from content
  const availableTags = [...new Set(content.flatMap(item => item.tags))].sort()

  const loadContent = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchContent()
      setContent(data)
    } catch (err) {
      setError('Failed to load content: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch content on mount
  useEffect(() => {
    loadContent()
  }, [loadContent])

  // Listen for content stats updates from other components
  useEffect(() => {
    const handleStatsUpdate = (event) => {
      loadContent()
    }

    window.addEventListener('content-stats-updated', handleStatsUpdate)
    return () => {
      window.removeEventListener('content-stats-updated', handleStatsUpdate)
    }
  }, [loadContent])

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Filter content based on search and tags
  const filteredContent = content.filter(item => {
    // Search in title and URL
    const matchesSearch = searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url.toLowerCase().includes(searchQuery.toLowerCase())

    // Match tags (AND logic - item must have all selected tags)
    const matchesTags = selectedTags.length === 0 ||
      selectedTags.every(tag => item.tags.includes(tag))

    return matchesSearch && matchesTags
  }).sort((a, b) => {
    if (!sortField) return 0

    let aValue, bValue

    // Handle different field types
    if (sortField === 'practice_count') {
      aValue = a.practice_count || 0
      bValue = b.practice_count || 0
    } else if (sortField === 'last_practiced') {
      aValue = a.last_practiced || ''
      bValue = b.last_practiced || ''
    } else {
      aValue = typeof a[sortField] === 'string' ? a[sortField].toLowerCase() : a[sortField]
      bValue = typeof b[sortField] === 'string' ? b[sortField].toLowerCase() : b[sortField]
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  // Toggle tag filter
  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('')
    setSelectedTags([])
  }

  // Check if any filters are active
  const hasActiveFilters = searchQuery !== '' || selectedTags.length > 0

  // Modal handlers
  const handleAddContent = () => {
    setEditingContent(null)
    setModalOpen(true)
  }

  const handleEditContent = (item) => {
    setEditingContent(item)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingContent(null)
  }

  const handleSaveContent = async (formData) => {
    try {
      if (formData.id) {
        // Edit existing content - optimistically update
        setContent(prev => prev.map(item =>
          item.id === formData.id
            ? { ...item, ...formData }
            : item
        ))

        // Update database in background
        await updateContent(formData.id, formData)
      } else {
        // Create new content
        const newContent = await createContent(formData)

        // Optimistically add to list with tags
        setContent(prev => [...prev, { ...newContent, tags: formData.tags || [] }])
      }
    } catch (err) {
      alert('Failed to save content: ' + err.message)
      console.error(err)
      // Reload on error to sync state
      await loadContent()
    }
  }

  const handleDeleteContent = async (itemId) => {
    try {
      // Optimistically remove from list
      setContent(prev => prev.filter(item => item.id !== itemId))

      // Update database in background
      await deleteContent(itemId)
    } catch (err) {
      alert('Failed to delete content: ' + err.message)
      console.error(err)
      // Reload on error to sync state
      await loadContent()
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Library</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your learning resources</p>
        </div>
        <Button
          className="bg-primary-600 hover:bg-primary-700"
          onClick={handleAddContent}
        >
          Add Content
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-4">
        {/* Search Input */}
        <div className="flex gap-4">
          <Input
            type="text"
            placeholder="Search by title or URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>

        {/* Tag Filters */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Filter by Tags:</p>
          <div className="flex gap-2 flex-wrap">
            {availableTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary-100 transition-colors"
                onClick={() => toggleTag(tag)}
              >
                {tag}
                {selectedTags.includes(tag) && (
                  <span className="ml-1 font-bold">✓</span>
                )}
              </Badge>
            ))}
          </div>
        </div>

        {/* Active Filters Display */}
        {selectedTags.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Active Filters:</p>
            <div className="flex gap-2 flex-wrap">
              {selectedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="default"
                  className="cursor-pointer bg-primary-600 hover:bg-primary-700"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                  <span className="ml-1 font-bold">×</span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Error loading content</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={loadContent}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Content Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[22%]">
                <button
                  onClick={() => handleSort('title')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  Title
                  {sortField === 'title' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </TableHead>
              <TableHead className="w-[18%]">URL</TableHead>
              <TableHead className="w-[15%]">Tags</TableHead>
              <TableHead className="w-[10%]">
                <button
                  onClick={() => handleSort('type')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  Type
                  {sortField === 'type' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </TableHead>
              <TableHead className="w-[12%]">
                <button
                  onClick={() => handleSort('practice_count')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  Practice Count
                  {sortField === 'practice_count' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </TableHead>
              <TableHead className="w-[13%]">
                <button
                  onClick={() => handleSort('last_practiced')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  Last Practiced
                  {sortField === 'last_practiced' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </TableHead>
              <TableHead className="w-[10%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-12">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    <span className="text-sm font-medium">Loading content...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredContent.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-12">
                  <div className="flex flex-col items-center justify-center gap-3">
                    {hasActiveFilters ? (
                      <>
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <div>
                          <p className="font-medium text-gray-900">No content found</p>
                          <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <p className="font-medium text-gray-900">No content yet</p>
                          <p className="text-sm text-gray-500 mt-1">Click "Add Content" to create your first item</p>
                        </div>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredContent.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>
                    {isYouTubeUrl(item.url) ? (
                      <button
                        onClick={(e) => handleYouTubeLinkClick(e, item)}
                        className="text-primary-600 hover:text-primary-700 hover:underline text-left"
                        title={item.url}
                      >
                        {truncateUrl(item.url)}
                      </button>
                    ) : (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 hover:underline"
                        title={item.url}
                      >
                        {truncateUrl(item.url)}
                      </a>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {item.tags.length > 0 ? (
                        item.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs cursor-pointer hover:bg-primary-100 transition-colors"
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-400 text-xs">No tags</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      <span className="mr-1">{getTypeIcon(item.type)}</span>
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 relative">
                      <span className="font-medium text-gray-900">{item.practice_count || 0}</span>
                      <span className="text-xs text-gray-500">sessions</span>
                      {(item.practice_count || 0) > 0 && (
                        <div className="relative">
                          <Info
                            className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                            onClick={(e) => handleTogglePracticeHistory(e, item.id)}
                          />
                          {practiceHistoryPopover.open && practiceHistoryPopover.contentId === item.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={handleClosePracticeHistory}
                              />
                              <div className={`absolute right-0 z-50 w-[900px] bg-white border border-gray-300 rounded-lg shadow-lg p-4 ${practiceHistoryPopover.openAbove ? 'bottom-6' : 'top-6'}`}>
                                <div className="flex items-center justify-between mb-3">
                                  <div className="text-sm font-semibold text-gray-900">Practice History</div>
                                  <button
                                    onClick={handleClosePracticeHistory}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    ×
                                  </button>
                                </div>
                                {practiceHistoryPopover.loading ? (
                                  <div className="flex items-center justify-center py-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                                  </div>
                                ) : practiceHistoryPopover.logs.length === 0 ? (
                                  <div className="text-sm text-gray-500 py-4 text-center">No practice history found</div>
                                ) : (
                                  <div className="max-h-80 overflow-y-auto">
                                    <table className="w-full text-xs table-fixed">
                                      <tbody>
                                        {practiceHistoryPopover.logs.map((log) => {
                                          const formatted = formatLogEntry(log)
                                          return (
                                            <tr key={log.id} className="border-b border-gray-100 last:border-0">
                                              <td className="py-2 pr-2 text-gray-600 whitespace-nowrap w-20">{formatted.date}</td>
                                              <td className="py-2 px-2 text-gray-900 font-medium whitespace-nowrap w-24">{formatted.topicTitle}</td>
                                              <td className="py-2 px-2 text-gray-700">{formatted.goalTitle}</td>
                                              <td className="py-2 pl-2 text-gray-600" title={formatted.logDescription}>
                                                {formatted.logDescription}
                                              </td>
                                            </tr>
                                          )
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">{formatDate(item.last_practiced)}</span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleEditContent(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
        <div>
          Showing {filteredContent.length} of {content.length} items
          {hasActiveFilters && (
            <span className="ml-2 text-primary-600 font-medium">
              (filtered)
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <div className="text-xs">
            {searchQuery && <span>Search: "{searchQuery}"</span>}
            {searchQuery && selectedTags.length > 0 && <span className="mx-2">•</span>}
            {selectedTags.length > 0 && (
              <span>Tags: {selectedTags.join(', ')}</span>
            )}
          </div>
        )}
      </div>

      {/* Content Modal */}
      <ContentModal
        open={modalOpen}
        onClose={handleCloseModal}
        contentData={editingContent}
        onSave={handleSaveContent}
        onDelete={handleDeleteContent}
      />

      {/* YouTube Modal */}
      <YouTubeModal
        open={youtubeModalOpen}
        onClose={() => setYoutubeModalOpen(false)}
        url={selectedYoutubeContent?.url}
        title={selectedYoutubeContent?.title}
      />
    </div>
  )
}
