import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchActivityData } from '../lib/queries'
import ActivityHeatmap from './ActivityHeatmap'

export default function StatsTab() {
  const { user } = useAuth()
  const [activityData, setActivityData] = useState([])
  const [selectedYear, setSelectedYear] = useState(2026)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user) {
      loadActivityData()
    }
  }, [user, selectedYear])

  async function loadActivityData() {
    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchActivityData(user.id, selectedYear)
      setActivityData(data)
    } catch (err) {
      console.error('Error loading activity data:', err)
      setError('Failed to load activity data')
    } finally {
      setIsLoading(false)
    }
  }

  function handleYearChange(year) {
    setSelectedYear(year)
  }

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Stats & Insights</h1>
        <p className="text-sm text-gray-600">Tracking your practice journey</p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" />
              <span>Loading activity data...</span>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Activity Heatmap */}
      {!isLoading && !error && (
        <ActivityHeatmap
          data={activityData}
          year={selectedYear}
          onYearChange={handleYearChange}
        />
      )}
    </div>
  )
}
