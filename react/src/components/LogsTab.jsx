import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { fetchLogsByDateRange } from '@/lib/queries'

export default function LogsTab() {
  const today = new Date().toISOString().split('T')[0]

  // State management
  const [logs, setLogs] = useState([])
  const [currentDate, setCurrentDate] = useState(today)
  const [searchStartDate, setSearchStartDate] = useState('')
  const [searchEndDate, setSearchEndDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load logs for current date
  useEffect(() => {
    if (!searchStartDate && !searchEndDate) {
      // Single day view
      loadLogs(currentDate, currentDate)
    }
  }, [currentDate, searchStartDate, searchEndDate])

  const loadLogs = async (startDate, endDate) => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchLogsByDateRange(startDate, endDate)
      setLogs(data)
    } catch (err) {
      setError('Failed to load logs: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Navigate to previous day
  const prevDay = () => {
    const date = new Date(currentDate)
    date.setDate(date.getDate() - 1)
    setCurrentDate(date.toISOString().split('T')[0])
    clearSearch()
  }

  // Navigate to next day
  const nextDay = () => {
    const date = new Date(currentDate)
    date.setDate(date.getDate() + 1)
    setCurrentDate(date.toISOString().split('T')[0])
    clearSearch()
  }

  // Navigate to today
  const goToToday = () => {
    setCurrentDate(today)
    clearSearch()
  }

  // Clear search and return to single day view
  const clearSearch = () => {
    setSearchStartDate('')
    setSearchEndDate('')
  }

  // Handle date range search
  const handleSearch = () => {
    if (searchStartDate && searchEndDate) {
      loadLogs(searchStartDate, searchEndDate)
    }
  }

  // Format date for display
  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00')
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    return date.toLocaleDateString('en-US', options)
  }

  // Format time from created_at
  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  // Check if current date is today
  const isToday = currentDate === today

  // Determine view title
  const getViewTitle = () => {
    if (searchStartDate && searchEndDate) {
      return `${formatDisplayDate(searchStartDate)} - ${formatDisplayDate(searchEndDate)}`
    }
    return formatDisplayDate(currentDate)
  }

  return (
    <div className="p-8">
      {/* Header with Date Navigation */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={prevDay}
              disabled={searchStartDate && searchEndDate}
            >
              ←
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">
              {getViewTitle()}
            </h1>
            <Button
              variant="outline"
              onClick={nextDay}
              disabled={searchStartDate && searchEndDate}
            >
              →
            </Button>
          </div>
          <Button
            className={isToday ? 'bg-gray-400' : 'bg-primary-600 hover:bg-primary-700'}
            onClick={goToToday}
            disabled={isToday && !searchStartDate && !searchEndDate}
          >
            Today
          </Button>
        </div>

        {/* Date Range Search */}
        <div className="flex gap-4 items-center bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-2 flex-1">
            <label className="text-sm font-medium text-gray-700">From:</label>
            <Input
              type="date"
              value={searchStartDate}
              onChange={(e) => setSearchStartDate(e.target.value)}
              className="flex-1"
            />
            <label className="text-sm font-medium text-gray-700">To:</label>
            <Input
              type="date"
              value={searchEndDate}
              onChange={(e) => setSearchEndDate(e.target.value)}
              className="flex-1"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={!searchStartDate || !searchEndDate}
            className="bg-primary-600 hover:bg-primary-700"
          >
            Search
          </Button>
          {(searchStartDate || searchEndDate) && (
            <Button
              variant="outline"
              onClick={clearSearch}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Error loading logs</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={() => searchStartDate && searchEndDate ? handleSearch() : loadLogs(currentDate, currentDate)}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Logs Display */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="text-sm font-medium text-gray-500">Loading logs...</span>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <p className="font-medium text-gray-900">No logs found</p>
              <p className="text-sm text-gray-500 mt-1">
                {searchStartDate && searchEndDate
                  ? 'Try a different date range'
                  : 'No practice logs for this date'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              {/* Log Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  {log.goals && (
                    <div className="flex items-center gap-2 mb-2">
                      {log.goals.topics && (
                        <Badge variant="outline" className="bg-primary-50 text-primary-700 border-primary-200">
                          {log.goals.topics.name}
                        </Badge>
                      )}
                      <span className="text-sm font-medium text-gray-900">{log.goals.description}</span>
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500">{formatTime(log.created_at)}</span>
              </div>

              {/* Log Entry */}
              <p className="text-gray-700 whitespace-pre-wrap mb-4">{log.entry}</p>

              {/* Content and Repertoire Tags */}
              {(log.content?.length > 0 || log.repertoire?.length > 0) && (
                <div className="flex gap-4 flex-wrap">
                  {log.content?.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">Content:</span>
                      <div className="flex gap-1 flex-wrap">
                        {log.content.map((item) => (
                          <Badge key={item.id} variant="secondary" className="text-xs">
                            {item.title}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {log.repertoire?.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">Repertoire:</span>
                      <div className="flex gap-1 flex-wrap">
                        {log.repertoire.map((item) => (
                          <Badge key={item.id} variant="secondary" className="text-xs">
                            {item.title}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {!loading && logs.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          {logs.length} {logs.length === 1 ? 'log' : 'logs'} found
        </div>
      )}
    </div>
  )
}
