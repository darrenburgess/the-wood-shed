import { useState, useMemo } from 'react'
import {
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  format,
  getDay,
  getMonth,
  startOfWeek,
  isLeapYear
} from 'date-fns'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from './ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Badge } from './ui/badge'
import { fetchLogsByDate } from '../lib/queries'
import { useAuth } from '../contexts/AuthContext'

// Helper function: Get color class based on count
function getColorClass(count) {
  if (count === 0) return 'bg-gray-100'
  if (count <= 2) return 'bg-blue-200'
  if (count <= 4) return 'bg-blue-400'
  if (count <= 7) return 'bg-blue-600'
  return 'bg-blue-800'
}

// Helper function: Fill missing dates with zero counts
function fillMissingDates(data, year) {
  const yearStart = startOfYear(new Date(year, 0, 1))
  const yearEnd = endOfYear(new Date(year, 0, 1))
  const allDates = eachDayOfInterval({ start: yearStart, end: yearEnd })

  // Create a map of existing data for quick lookup
  const dataMap = {}
  data.forEach(item => {
    dataMap[item.date] = item.count
  })

  // Fill in all dates
  return allDates.map(date => {
    const dateString = format(date, 'yyyy-MM-dd')
    return {
      date: dateString,
      count: dataMap[dateString] || 0
    }
  })
}

// Helper function: Group days by week
function groupByWeek(filledData, year) {
  const yearStart = startOfYear(new Date(year, 0, 1))
  const firstDayOfWeek = getDay(yearStart) // 0 = Sunday, 1 = Monday, etc.

  // Create an array of weeks, each week is an array of 7 days
  const weeks = []
  let currentWeek = new Array(7).fill(null)

  // Fill the first partial week with nulls before the year starts
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek[i] = null
  }

  // Fill in the actual days
  filledData.forEach((dayData, index) => {
    const dayOfWeek = (firstDayOfWeek + index) % 7
    currentWeek[dayOfWeek] = dayData

    // If we've completed a week (Saturday), start a new week
    if (dayOfWeek === 6) {
      weeks.push(currentWeek)
      currentWeek = new Array(7).fill(null)
    }
  })

  // Push the last partial week if it has any data
  if (currentWeek.some(day => day !== null)) {
    weeks.push(currentWeek)
  }

  return weeks
}

// Helper function: Format date for tooltip
function formatTooltipDate(dateString, count) {
  const date = new Date(dateString + 'T00:00:00')
  const formattedDate = format(date, 'EEEE, MMMM d, yyyy')

  if (count === 0) {
    return `${formattedDate}\nNo logs on this day`
  }

  const logText = count === 1 ? 'log' : 'logs'
  return `${formattedDate}\n${count} ${logText}`
}

// Helper function: Get month labels with their week positions
function getMonthLabels(year) {
  const yearStart = startOfYear(new Date(year, 0, 1))
  const yearEnd = endOfYear(new Date(year, 0, 1))
  const allDates = eachDayOfInterval({ start: yearStart, end: yearEnd })
  const firstDayOfWeek = getDay(yearStart)

  const monthLabels = []
  let lastMonth = -1

  allDates.forEach((date, index) => {
    const month = getMonth(date)

    // Add a label when we encounter a new month
    if (month !== lastMonth) {
      const weekIndex = Math.floor((firstDayOfWeek + index) / 7)
      monthLabels.push({
        month: format(date, 'MMM'),
        weekIndex
      })
      lastMonth = month
    }
  })

  return monthLabels
}

export default function ActivityHeatmap({ data, year, onYearChange }) {
  const { user } = useAuth()
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedDateLogs, setSelectedDateLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // Process data
  const processedData = useMemo(() => {
    const filled = fillMissingDates(data, year)
    const weeks = groupByWeek(filled, year)
    const months = getMonthLabels(year)
    const totalCount = data.reduce((sum, item) => sum + item.count, 0)

    return { weeks, months, totalCount }
  }, [data, year])

  const { weeks, months, totalCount } = processedData

  // Generate year options (starting from 2025)
  const yearOptions = [2025, 2026, 2027]

  // Handle day click
  async function handleDayClick(dayData) {
    if (dayData.count === 0) return // Don't fetch if no logs

    setSelectedDate(dayData.date)
    setLoadingLogs(true)

    try {
      const logs = await fetchLogsByDate(user.id, dayData.date)
      setSelectedDateLogs(logs)
    } catch (error) {
      console.error('Error fetching logs for date:', error)
      setSelectedDateLogs([])
    } finally {
      setLoadingLogs(false)
    }
  }

  // Format date for display
  function formatDisplayDate(dateString) {
    const date = new Date(dateString + 'T00:00:00')
    return format(date, 'EEEE, MMMM d, yyyy')
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-700">
            <span className="font-semibold">{totalCount}</span> logs in {year}
          </div>

          {/* Year Selector */}
          <Select value={year.toString()} onValueChange={(value) => onYearChange(parseInt(value))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(y => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Calendar Grid */}
        <div className="overflow-x-auto pb-2">
          <div className="inline-block" style={{ minWidth: 'max-content' }}>
            {/* Month Labels */}
            <div className="relative ml-8 mb-2 h-4">
              {months.map((monthLabel, idx) => (
                <div
                  key={idx}
                  className="text-xs text-gray-500 absolute"
                  style={{
                    left: `${monthLabel.weekIndex * 19}px`
                  }}
                >
                  {monthLabel.month}
                </div>
              ))}
            </div>

            {/* Grid Container */}
            <div className="flex">
              {/* Day Labels */}
              <div className="flex flex-col gap-[5px] mr-2">
                {dayLabels.map((day, idx) => (
                  <div
                    key={day}
                    className="text-xs text-gray-500 h-[14px] flex items-center"
                  >
                    {idx % 2 === 1 ? day : ''}
                  </div>
                ))}
              </div>

              {/* Weeks Grid */}
              <div className="flex gap-[5px]">
                {weeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-[5px]">
                    {week.map((day, dayIdx) => {
                      if (!day) {
                        // Empty cell for partial weeks
                        return (
                          <div
                            key={dayIdx}
                            className="w-[14px] h-[14px]"
                          />
                        )
                      }

                      return (
                        <Tooltip key={dayIdx}>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-[14px] h-[14px] rounded-sm ${getColorClass(day.count)} hover:ring-2 hover:ring-primary-500 ${day.count > 0 ? 'cursor-pointer' : ''} transition-all ${selectedDate === day.date ? 'ring-2 ring-primary-600' : ''}`}
                              onClick={() => handleDayClick(day)}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs whitespace-pre-line">
                              {formatTooltipDate(day.date, day.count)}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
      <div className="flex items-center gap-2 mt-4 text-sm text-gray-600">
        <span>Less</span>
        <div className="flex gap-[5px]">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-[14px] h-[14px] rounded-sm bg-gray-100 border border-gray-200 cursor-default" />
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">0 logs</div>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-[14px] h-[14px] rounded-sm bg-blue-200 cursor-default" />
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">1-2 logs</div>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-[14px] h-[14px] rounded-sm bg-blue-400 cursor-default" />
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">3-4 logs</div>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-[14px] h-[14px] rounded-sm bg-blue-600 cursor-default" />
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">5-7 logs</div>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-[14px] h-[14px] rounded-sm bg-blue-800 cursor-default" />
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">8+ logs</div>
            </TooltipContent>
          </Tooltip>
        </div>
        <span>More</span>
      </div>

      {/* Selected Date Logs Display */}
      {selectedDate && (
        <div className="mt-6 border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {formatDisplayDate(selectedDate)}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>

          {loadingLogs ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
            </div>
          ) : selectedDateLogs.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No logs found for this date.</p>
          ) : (
            <div className="space-y-3">
              {selectedDateLogs.map(log => (
                <div key={log.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      {/* Show topic and goal if available */}
                      {log.topic && log.goal && (
                        <div className="text-xs text-gray-500 mb-1">
                          {log.topic.title} → {log.goal.description}
                        </div>
                      )}

                      {/* Log entry */}
                      <p className="text-sm text-gray-900">{log.entry}</p>

                      {/* Content and Repertoire badges */}
                      {(log.content?.length > 0 || log.repertoire?.length > 0) && (
                        <div className="flex gap-1 flex-wrap mt-2">
                          {log.content?.map((item) => (
                            <Badge key={item.id} className="bg-blue-100 text-blue-800 text-xs">
                              {item.title}
                            </Badge>
                          ))}
                          {log.repertoire?.map((item) => (
                            <Badge key={item.id} className="bg-green-100 text-green-800 text-xs">
                              {item.title}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </TooltipProvider>
  )
}
