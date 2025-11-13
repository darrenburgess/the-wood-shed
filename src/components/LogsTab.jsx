import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { getTodayDateET } from '@/lib/dateUtils'
import { fetchLogsByDateRange } from '@/lib/queries'

export default function LogsTab() {
  const today = getTodayDateET()

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

  // Format date for log entry (just the date, no time)
  const formatLogDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
  }

  // Group logs by topic and goal
  const groupLogsByTopicAndGoal = (logs) => {
    const grouped = {}

    logs.forEach(log => {
      // Skip logs without goals or topics
      if (!log.goals || !log.goals.topics) {
        return
      }

      const topicName = log.goals.topics.title
      const goalId = log.goals.id
      const goalNumber = log.goals.goal_number || ''
      const goalDescription = log.goals.description

      if (!grouped[topicName]) {
        grouped[topicName] = {}
      }

      if (!grouped[topicName][goalId]) {
        grouped[topicName][goalId] = {
          goalNumber,
          goalDescription,
          logs: []
        }
      }

      grouped[topicName][goalId].logs.push(log)
    })

    return grouped
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Practice Logs</h1>
            <p className="text-sm text-gray-500 mt-1">A summary of your work by date</p>
          </div>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="bg-white border-b px-8 py-6">
        <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
          <button
            onClick={prevDay}
            disabled={searchStartDate && searchEndDate}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={currentDate}
              onChange={(e) => { setCurrentDate(e.target.value); clearSearch(); }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            />
          </div>

          <button
            onClick={nextDay}
            disabled={searchStartDate && searchEndDate}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {!isToday && !searchStartDate && !searchEndDate && (
            <button
              onClick={goToToday}
              className="ml-4 text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              ← Today
            </button>
          )}
        </div>
      </div>

      {/* Date Range Search Section */}
      <div className="px-8 py-6">
        <div className="mb-6">

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
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-8 pt-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
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
        </div>
      )}

      {/* Logs Display */}
      <div className="px-8">
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
          <div className="space-y-6">
            {Object.entries(groupLogsByTopicAndGoal(logs)).map(([topicName, goals]) => (
              <div key={topicName} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                {/* Topic Heading */}
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{topicName}</h2>

                {/* Goals */}
                {Object.entries(goals).map(([goalId, goalData]) => (
                  <div key={goalId} className="mb-6 last:mb-0">
                    {/* Goal Subheading */}
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      {goalData.goalNumber && `${goalData.goalNumber}: `}{goalData.goalDescription}
                    </h3>

                    {/* Logs */}
                    <div className="space-y-2">
                      {goalData.logs.map((log) => (
                        <div key={log.id} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-gray-500 shrink-0">{formatLogDate(log.date)}</span>
                          <span className="flex-1">{log.entry}</span>

                          {/* Content and Repertoire inline */}
                          {(log.content?.length > 0 || log.repertoire?.length > 0) && (
                            <span className="shrink-0 flex gap-1 flex-wrap">
                              {log.content?.map((item) => (
                                <Badge key={item.id} variant="secondary" className="text-xs">
                                  {item.title}
                                </Badge>
                              ))}
                              {log.repertoire?.map((item) => (
                                <Badge key={item.id} variant="secondary" className="text-xs">
                                  {item.title}
                                </Badge>
                              ))}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
    </div>
  )
}
