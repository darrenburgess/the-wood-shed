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
    const dayOfWeek = (firstDayOfWeek + index) % 7

    // Only add a label when we encounter a new month on Sunday or the first day of the year
    if (month !== lastMonth && (dayOfWeek === 0 || index === 0)) {
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
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Process data
  const processedData = useMemo(() => {
    const filled = fillMissingDates(data, year)
    const weeks = groupByWeek(filled, year)
    const months = getMonthLabels(year)
    const totalCount = data.reduce((sum, item) => sum + item.count, 0)

    return { weeks, months, totalCount }
  }, [data, year])

  const { weeks, months, totalCount } = processedData

  // Generate year options (current year and 3 previous years)
  const currentYear = new Date().getFullYear()
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3]

  return (
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
      <div className="overflow-x-auto">
        <TooltipProvider delayDuration={100}>
          <div className="inline-block min-w-full">
            {/* Month Labels */}
            <div className="flex ml-8 mb-2">
              {months.map((monthLabel, idx) => (
                <div
                  key={idx}
                  className="text-xs text-gray-500"
                  style={{
                    marginLeft: idx === 0 ? 0 : `${(monthLabel.weekIndex - (months[idx - 1]?.weekIndex || 0)) * 15}px`
                  }}
                >
                  {monthLabel.month}
                </div>
              ))}
            </div>

            {/* Grid Container */}
            <div className="flex">
              {/* Day Labels */}
              <div className="flex flex-col gap-[3px] mr-2">
                {dayLabels.map((day, idx) => (
                  <div
                    key={day}
                    className="text-xs text-gray-500 h-3 flex items-center"
                  >
                    {idx % 2 === 1 ? day : ''}
                  </div>
                ))}
              </div>

              {/* Weeks Grid */}
              <div className="flex gap-[3px]">
                {weeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-[3px]">
                    {week.map((day, dayIdx) => {
                      if (!day) {
                        // Empty cell for partial weeks
                        return (
                          <div
                            key={dayIdx}
                            className="w-3 h-3"
                          />
                        )
                      }

                      return (
                        <Tooltip key={dayIdx}>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-3 h-3 rounded-sm ${getColorClass(day.count)} hover:ring-2 hover:ring-primary-500 cursor-pointer transition-all`}
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
        </TooltipProvider>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 text-sm text-gray-600">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200" />
          <div className="w-3 h-3 rounded-sm bg-blue-200" />
          <div className="w-3 h-3 rounded-sm bg-blue-400" />
          <div className="w-3 h-3 rounded-sm bg-blue-600" />
          <div className="w-3 h-3 rounded-sm bg-blue-800" />
        </div>
        <span>More</span>
      </div>
    </div>
  )
}
