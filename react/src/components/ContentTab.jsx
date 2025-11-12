import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function ContentTab() {
  // State management
  const [content, setContent] = useState([
    { id: 1, title: 'Sample Video', url: 'https://youtube.com/watch?v=example', type: 'youtube', tags: ['jazz', 'bebop'] },
    { id: 2, title: 'Sample Article', url: 'https://example.com', type: 'article', tags: ['theory'] },
    { id: 3, title: 'Another Video', url: 'https://youtube.com/watch?v=example2', type: 'youtube', tags: ['jazz', 'improvisation'] },
  ])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [loading, setLoading] = useState(false)

  // Fetch content on mount
  useEffect(() => {
    // TODO: Implement actual data fetching
    // fetchContent().then(data => setContent(data))
  }, [])

  // Filter content based on search and tags
  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTags = selectedTags.length === 0 ||
      selectedTags.some(tag => item.tags.includes(tag))
    return matchesSearch && matchesTags
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content Library</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your learning resources</p>
        </div>
        <Button className="bg-primary-600 hover:bg-primary-700">
          Add Content
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="flex gap-4">
          <Input
            type="text"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline">
            Filter by Tags
          </Button>
        </div>
      </div>

      {/* Content Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Title</TableHead>
              <TableHead className="w-[30%]">URL</TableHead>
              <TableHead className="w-[15%]">Type</TableHead>
              <TableHead className="w-[15%]">Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContent.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                  {searchQuery ? 'No content found matching your search' : 'No content yet. Add your first item!'}
                </TableCell>
              </TableRow>
            ) : (
              filteredContent.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 hover:underline truncate block max-w-xs"
                    >
                      {item.url}
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-500">
        Showing {filteredContent.length} of {content.length} items
      </div>
    </div>
  )
}
