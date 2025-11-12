import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Calendar, Plus, Link as LinkIcon, X } from 'lucide-react'
import GoalModal from './GoalModal'
import {
  fetchSessionByDate,
  createSession,
  deleteSession,
  removeGoalFromSessionById,
  createLog,
  updateLog,
  deleteLog as deleteLogQuery,
  searchContent,
  searchRepertoire,
  linkContentToGoal,
  unlinkContentFromGoal,
  linkRepertoireToGoal,
  unlinkRepertoireFromGoal,
  linkContentToLog,
  unlinkContentFromLog,
  linkRepertoireToLog,
  unlinkRepertoireFromLog,
  updateGoal,
  deleteGoal
} from '@/lib/queries'

export default function PracticeTodayTab() {
  // State management
  const [currentDate, setCurrentDate] = useState(getTodayDate())
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Log form states (per goal)
  const [newLogInputs, setNewLogInputs] = useState({})

  // Edit log modal
  const [logModalOpen, setLogModalOpen] = useState(false)
  const [editingLog, setEditingLog] = useState(null)

  // Edit goal modal
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)

  // YouTube modal
  const [youtubeModalOpen, setYoutubeModalOpen] = useState(false)
  const [youtubeVideoId, setYoutubeVideoId] = useState(null)

  // Content/repertoire search states (per goal and log)
  const [goalContentSearches, setGoalContentSearches] = useState({})
  const [goalRepertoireSearches, setGoalRepertoireSearches] = useState({})
  const [logContentSearches, setLogContentSearches] = useState({})
  const [logRepertoireSearches, setLogRepertoireSearches] = useState({})

  // Expand/collapse state with localStorage persistence
  const [openGoals, setOpenGoals] = useState(() => {
    const saved = localStorage.getItem('openGoalsPracticeToday')
    return saved ? JSON.parse(saved) : {}
  })

  // Show all logs state (per goal) - default to false (show only today's logs)
  const [showAllLogs, setShowAllLogs] = useState({})

  // Helper function to get today's date in YYYY-MM-DD format
  function getTodayDate() {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  // Helper function to check if viewing today
  function isToday() {
    return currentDate === getTodayDate()
  }

  // Format date for display
  function formatDateDisplay(dateString) {
    const date = new Date(dateString + 'T00:00:00')
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    return date.toLocaleDateString('en-US', options)
  }

  // Format date for logs
  function formatLogDateTime(dateString) {
    const logDate = new Date(dateString)
    return logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Extract YouTube video ID from URL
  function extractYouTubeVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }
    return null
  }

  // Handle content click
  function handleContentClick(content) {
    if (content.type === 'youtube') {
      const videoId = extractYouTubeVideoId(content.url)
      if (videoId) {
        setYoutubeVideoId(videoId)
        setYoutubeModalOpen(true)
      } else {
        window.open(content.url, '_blank')
      }
    } else {
      window.open(content.url, '_blank')
    }
  }

  // Navigate to previous day
  function handlePreviousDay() {
    const date = new Date(currentDate + 'T00:00:00')
    date.setDate(date.getDate() - 1)
    setCurrentDate(date.toISOString().split('T')[0])
  }

  // Navigate to next day
  function handleNextDay() {
    const date = new Date(currentDate + 'T00:00:00')
    date.setDate(date.getDate() + 1)
    setCurrentDate(date.toISOString().split('T')[0])
  }

  // Navigate to today
  function handleGoToToday() {
    setCurrentDate(getTodayDate())
  }

  // Load session for current date
  async function loadSession() {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchSessionByDate(currentDate)
      setSession(data)
    } catch (err) {
      setError('Failed to load session: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Clear session
  async function handleClearSession() {
    if (!session) return

    if (!confirm('Clear all goals from this session? This will not delete the goals or logs, just remove them from the session.')) {
      return
    }

    try {
      await deleteSession(session.id)
      setSession(null)
    } catch (err) {
      alert('Failed to clear session: ' + err.message)
      console.error(err)
    }
  }

  // Remove goal from session
  async function handleRemoveGoalFromSession(goalId) {
    if (!session) return

    try {
      await removeGoalFromSessionById(session.id, goalId)
      await loadSession()
    } catch (err) {
      alert('Failed to remove goal from session: ' + err.message)
      console.error(err)
    }
  }

  // Add log
  async function handleAddLog(goalId) {
    const logText = newLogInputs[goalId]?.trim()
    if (!logText) return

    try {
      await createLog(goalId, logText, currentDate)

      // Clear input
      setNewLogInputs(prev => ({ ...prev, [goalId]: '' }))

      // Reload session
      await loadSession()
    } catch (err) {
      alert('Failed to add log: ' + err.message)
      console.error(err)
    }
  }

  // Edit log
  function handleEditLog(log) {
    setEditingLog(log)
    setLogModalOpen(true)
  }

  // Save edited log
  async function handleSaveLog(logId, updates) {
    try {
      await updateLog(logId, updates)
      setLogModalOpen(false)
      setEditingLog(null)
      await loadSession()
    } catch (err) {
      alert('Failed to update log: ' + err.message)
      console.error(err)
    }
  }

  // Delete log
  async function handleDeleteLog(logId) {
    if (!confirm('Delete this log entry?')) return

    try {
      await deleteLogQuery(logId)
      setLogModalOpen(false)
      setEditingLog(null)
      await loadSession()
    } catch (err) {
      alert('Failed to delete log: ' + err.message)
      console.error(err)
    }
  }

  // Content search for goals
  async function handleGoalContentSearch(goalId, searchTerm) {
    setGoalContentSearches(prev => ({
      ...prev,
      [goalId]: { ...prev[goalId], query: searchTerm, searching: true }
    }))

    try {
      const results = await searchContent(searchTerm)
      setGoalContentSearches(prev => ({
        ...prev,
        [goalId]: { ...prev[goalId], results, searching: false }
      }))
    } catch (err) {
      console.error('Content search error:', err)
      setGoalContentSearches(prev => ({
        ...prev,
        [goalId]: { ...prev[goalId], results: [], searching: false }
      }))
    }
  }

  // Link content to goal
  async function handleLinkContentToGoal(goalId, contentId) {
    try {
      await linkContentToGoal(goalId, contentId)
      // Close dropdown
      setGoalContentSearches(prev => ({ ...prev, [goalId]: { open: false, query: '', results: [] } }))
      // Reload session
      await loadSession()
    } catch (err) {
      alert('Failed to link content: ' + err.message)
      console.error(err)
    }
  }

  // Unlink content from goal
  async function handleUnlinkContentFromGoal(goalId, contentId) {
    try {
      await unlinkContentFromGoal(goalId, contentId)
      await loadSession()
    } catch (err) {
      alert('Failed to unlink content: ' + err.message)
      console.error(err)
    }
  }

  // Repertoire search for goals
  async function handleGoalRepertoireSearch(goalId, searchTerm) {
    setGoalRepertoireSearches(prev => ({
      ...prev,
      [goalId]: { ...prev[goalId], query: searchTerm, searching: true }
    }))

    try {
      const results = await searchRepertoire(searchTerm)
      setGoalRepertoireSearches(prev => ({
        ...prev,
        [goalId]: { ...prev[goalId], results, searching: false }
      }))
    } catch (err) {
      console.error('Repertoire search error:', err)
      setGoalRepertoireSearches(prev => ({
        ...prev,
        [goalId]: { ...prev[goalId], results: [], searching: false }
      }))
    }
  }

  // Link repertoire to goal
  async function handleLinkRepertoireToGoal(goalId, repertoireId) {
    try {
      await linkRepertoireToGoal(goalId, repertoireId)
      // Close dropdown
      setGoalRepertoireSearches(prev => ({ ...prev, [goalId]: { open: false, query: '', results: [] } }))
      // Reload session
      await loadSession()
    } catch (err) {
      alert('Failed to link repertoire: ' + err.message)
      console.error(err)
    }
  }

  // Unlink repertoire from goal
  async function handleUnlinkRepertoireFromGoal(goalId, repertoireId) {
    try {
      await unlinkRepertoireFromGoal(goalId, repertoireId)
      await loadSession()
    } catch (err) {
      alert('Failed to unlink repertoire: ' + err.message)
      console.error(err)
    }
  }

  // Edit goal
  function handleEditGoal(goal) {
    setEditingGoal(goal)
    setGoalModalOpen(true)
  }

  // Save edited goal
  async function handleSaveGoal(goalId, updateData) {
    try {
      await updateGoal(goalId, updateData)
      setGoalModalOpen(false)
      setEditingGoal(null)
      await loadSession()
    } catch (err) {
      alert('Failed to update goal: ' + err.message)
      console.error(err)
    }
  }

  // Delete goal
  async function handleDeleteGoal(goalId) {
    try {
      await deleteGoal(goalId)
      setGoalModalOpen(false)
      setEditingGoal(null)
      await loadSession()
    } catch (err) {
      alert('Failed to delete goal: ' + err.message)
      console.error(err)
    }
  }

  // Content search for logs
  async function handleLogContentSearch(logId, searchTerm) {
    setLogContentSearches(prev => ({
      ...prev,
      [logId]: { ...prev[logId], query: searchTerm, searching: true }
    }))

    try {
      const results = await searchContent(searchTerm)
      setLogContentSearches(prev => ({
        ...prev,
        [logId]: { ...prev[logId], results, searching: false }
      }))
    } catch (err) {
      console.error('Content search error:', err)
      setLogContentSearches(prev => ({
        ...prev,
        [logId]: { ...prev[logId], results: [], searching: false }
      }))
    }
  }

  // Link content to log
  async function handleLinkContentToLog(logId, contentId) {
    try {
      await linkContentToLog(logId, contentId)
      setLogContentSearches(prev => ({ ...prev, [logId]: { open: false, query: '', results: [] } }))
      await loadSession()
    } catch (err) {
      alert('Failed to link content: ' + err.message)
      console.error(err)
    }
  }

  // Unlink content from log
  async function handleUnlinkContentFromLog(logId, contentId) {
    try {
      await unlinkContentFromLog(logId, contentId)
      await loadSession()
    } catch (err) {
      alert('Failed to unlink content: ' + err.message)
      console.error(err)
    }
  }

  // Repertoire search for logs
  async function handleLogRepertoireSearch(logId, searchTerm) {
    setLogRepertoireSearches(prev => ({
      ...prev,
      [logId]: { ...prev[logId], query: searchTerm, searching: true }
    }))

    try {
      const results = await searchRepertoire(searchTerm)
      setLogRepertoireSearches(prev => ({
        ...prev,
        [logId]: { ...prev[logId], results, searching: false }
      }))
    } catch (err) {
      console.error('Repertoire search error:', err)
      setLogRepertoireSearches(prev => ({
        ...prev,
        [logId]: { ...prev[logId], results: [], searching: false }
      }))
    }
  }

  // Link repertoire to log
  async function handleLinkRepertoireToLog(logId, repertoireId) {
    try {
      await linkRepertoireToLog(logId, repertoireId)
      setLogRepertoireSearches(prev => ({ ...prev, [logId]: { open: false, query: '', results: [] } }))
      await loadSession()
    } catch (err) {
      alert('Failed to link repertoire: ' + err.message)
      console.error(err)
    }
  }

  // Unlink repertoire from log
  async function handleUnlinkRepertoireFromLog(logId, repertoireId) {
    try {
      await unlinkRepertoireFromLog(logId, repertoireId)
      await loadSession()
    } catch (err) {
      alert('Failed to unlink repertoire: ' + err.message)
      console.error(err)
    }
  }

  // Load session when date changes
  useEffect(() => {
    loadSession()
  }, [currentDate])

  // Save openGoals to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('openGoalsPracticeToday', JSON.stringify(openGoals))
  }, [openGoals])

  // Expand/collapse all functions
  function handleExpandAll() {
    if (!session || !session.goals) return
    const allGoalsOpen = {}
    session.goals.forEach(goal => {
      allGoalsOpen[goal.id] = true
    })
    setOpenGoals(allGoalsOpen)
  }

  function handleCollapseAll() {
    setOpenGoals({})
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Session Header */}
      <div className="bg-white border-b px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Practice Today</h1>
            <p className="text-sm text-gray-500 mt-1">Your practice session for {formatDateDisplay(currentDate)}</p>
          </div>
          <div className="flex gap-2">
            {session && session.goals?.length > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={handleExpandAll}
                >
                  Expand All
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCollapseAll}
                >
                  Collapse All
                </Button>
                <Button
                  onClick={handleClearSession}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2"
                >
                  Clear Session
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="bg-white border-b px-8 py-6">
        <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
          <button
            onClick={handlePreviousDay}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            title="Previous day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            />
          </div>

          <button
            onClick={handleNextDay}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            title="Next day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {!isToday() && (
            <button
              onClick={handleGoToToday}
              className="ml-4 text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              ← Today
            </button>
          )}
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
                <h3 className="text-sm font-medium text-red-800">Error loading session</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={loadSession}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="p-8 flex flex-col items-center justify-center gap-3 py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="text-sm font-medium text-gray-500">Loading practice session...</span>
        </div>
      ) : !session || session.goals?.length === 0 ? (
        /* Empty State */
        <div className="p-8 flex flex-col items-center justify-center gap-3 py-12">
          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <div className="text-center">
            <p className="font-medium text-gray-900">No goals in this session</p>
            <p className="text-sm text-gray-500 mt-1">Go to Topics to add goals to your practice session</p>
          </div>
        </div>
      ) : (
        /* Goal Cards */
        <div className="p-8 space-y-6">
          {session.goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currentDate={currentDate}
              newLogInputs={newLogInputs}
              setNewLogInputs={setNewLogInputs}
              goalContentSearches={goalContentSearches}
              setGoalContentSearches={setGoalContentSearches}
              goalRepertoireSearches={goalRepertoireSearches}
              setGoalRepertoireSearches={setGoalRepertoireSearches}
              logContentSearches={logContentSearches}
              setLogContentSearches={setLogContentSearches}
              logRepertoireSearches={logRepertoireSearches}
              setLogRepertoireSearches={setLogRepertoireSearches}
              openGoals={openGoals}
              setOpenGoals={setOpenGoals}
              showAllLogs={showAllLogs}
              setShowAllLogs={setShowAllLogs}
              onRemoveFromSession={handleRemoveGoalFromSession}
              onAddLog={handleAddLog}
              onEditLog={handleEditLog}
              onDeleteLog={handleDeleteLog}
              onEditGoal={handleEditGoal}
              onGoalContentSearch={handleGoalContentSearch}
              onLinkContentToGoal={handleLinkContentToGoal}
              onUnlinkContentFromGoal={handleUnlinkContentFromGoal}
              onGoalRepertoireSearch={handleGoalRepertoireSearch}
              onLinkRepertoireToGoal={handleLinkRepertoireToGoal}
              onUnlinkRepertoireFromGoal={handleUnlinkRepertoireFromGoal}
              onLogContentSearch={handleLogContentSearch}
              onLinkContentToLog={handleLinkContentToLog}
              onUnlinkContentFromLog={handleUnlinkContentFromLog}
              onLogRepertoireSearch={handleLogRepertoireSearch}
              onLinkRepertoireToLog={handleLinkRepertoireToLog}
              onUnlinkRepertoireFromLog={handleUnlinkRepertoireFromLog}
              onContentClick={handleContentClick}
              formatLogDateTime={formatLogDateTime}
            />
          ))}
        </div>
      )}

      {/* Log Edit Modal */}
      <LogModal
        open={logModalOpen}
        onClose={() => {
          setLogModalOpen(false)
          setEditingLog(null)
        }}
        log={editingLog}
        onSave={handleSaveLog}
        onDelete={handleDeleteLog}
      />

      {/* Goal Edit Modal */}
      <GoalModal
        open={goalModalOpen}
        onClose={() => {
          setGoalModalOpen(false)
          setEditingGoal(null)
        }}
        goalData={editingGoal}
        onSave={handleSaveGoal}
        onDelete={handleDeleteGoal}
      />

      {/* YouTube Modal */}
      <Dialog open={youtubeModalOpen} onOpenChange={setYoutubeModalOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>YouTube Video</DialogTitle>
          </DialogHeader>
          <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
            <iframe
              src={`https://www.youtube.com/embed/${youtubeVideoId}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Goal Card Component
function GoalCard({
  goal,
  currentDate,
  newLogInputs,
  setNewLogInputs,
  goalContentSearches,
  setGoalContentSearches,
  goalRepertoireSearches,
  setGoalRepertoireSearches,
  logContentSearches,
  setLogContentSearches,
  logRepertoireSearches,
  setLogRepertoireSearches,
  openGoals,
  setOpenGoals,
  showAllLogs,
  setShowAllLogs,
  onRemoveFromSession,
  onAddLog,
  onEditLog,
  onDeleteLog,
  onEditGoal,
  onGoalContentSearch,
  onLinkContentToGoal,
  onUnlinkContentFromGoal,
  onGoalRepertoireSearch,
  onLinkRepertoireToGoal,
  onUnlinkRepertoireFromGoal,
  onLogContentSearch,
  onLinkContentToLog,
  onUnlinkContentFromLog,
  onLogRepertoireSearch,
  onLinkRepertoireToLog,
  onUnlinkRepertoireFromLog,
  onContentClick,
  formatLogDateTime
}) {
  // Filter logs by current date
  const todaysLogs = goal.logs?.filter(log => {
    const logDate = new Date(log.date).toISOString().split('T')[0]
    return logDate === currentDate
  }) || []

  // Determine which logs to display
  const displayLogs = showAllLogs[goal.id] ? goal.logs : todaysLogs
  const totalLogs = goal.logs?.length || 0
  const todaysLogsCount = todaysLogs.length
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
      <details
        open={openGoals[goal.id]}
        onToggle={(e) => setOpenGoals(prev => ({
          ...prev,
          [goal.id]: e.target.open
        }))}
      >
        <summary className="p-6 cursor-pointer list-none">
          {/* Goal Header */}
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {goal.goal_number ? `${goal.goal_number}: ` : ''}{goal.description}
                {goal.topic && (
                  <span className="text-sm text-gray-500 font-normal ml-2">| {goal.topic.title}</span>
                )}
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              {/* Content count button */}
              <button
                onClick={() => setGoalContentSearches(prev => ({
                  ...prev,
                  [goal.id]: { open: !prev[goal.id]?.open, query: '', results: [] }
                }))}
                className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-medium flex items-center justify-center hover:bg-blue-700"
                title={`Content (${goal.content?.length || 0})`}
              >
                {goal.content?.length || 0}
              </button>

              {/* Repertoire count button */}
              <button
                onClick={() => setGoalRepertoireSearches(prev => ({
                  ...prev,
                  [goal.id]: { open: !prev[goal.id]?.open, query: '', results: [] }
                }))}
                className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-medium flex items-center justify-center hover:bg-green-700"
                title={`Repertoire (${goal.repertoire?.length || 0})`}
              >
                {goal.repertoire?.length || 0}
              </button>

              {/* Edit button */}
              <button
                onClick={() => onEditGoal(goal)}
                className="text-gray-600 hover:text-gray-800 p-1"
                title="Edit goal"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>

              {/* Remove from session button */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  onRemoveFromSession(goal.id)
                }}
                className="text-gray-400 hover:text-red-500 transition p-1"
                title="Remove from session"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </summary>

        <div className="px-6 pb-6 relative">
          {/* Goal Content Search Dropdown */}
          {goalContentSearches[goal.id]?.open && (
            <div className="absolute top-8 right-0 z-50 bg-white shadow-lg border border-gray-200 rounded-lg p-4 w-80">
              <h4 className="text-sm font-medium mb-2">Linked Content</h4>
              {goal.content && goal.content.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {goal.content.map(content => (
                    <Badge key={content.id} className="bg-blue-100 text-blue-800 flex items-center gap-1">
                      {content.title}
                      <button
                        onClick={() => onUnlinkContentFromGoal(goal.id, content.id)}
                        className="ml-1 hover:text-blue-900"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Input
                type="text"
                placeholder="Search content..."
                value={goalContentSearches[goal.id]?.query || ''}
                onChange={(e) => onGoalContentSearch(goal.id, e.target.value)}
                autoFocus
                className="mb-2"
              />
              {goalContentSearches[goal.id]?.results?.length > 0 && (
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {goalContentSearches[goal.id].results.map(content => {
                    const alreadyLinked = goal.content?.some(c => c.id === content.id)
                    return (
                      <button
                        key={content.id}
                        onClick={() => !alreadyLinked && onLinkContentToGoal(goal.id, content.id)}
                        disabled={alreadyLinked}
                        className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded ${alreadyLinked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {content.title}
                      </button>
                    )
                  })}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => setGoalContentSearches(prev => ({ ...prev, [goal.id]: { open: false, query: '', results: [] } }))}
              >
                Close
              </Button>
            </div>
          )}

          {/* Goal Repertoire Search Dropdown */}
          {goalRepertoireSearches[goal.id]?.open && (
            <div className="absolute top-8 right-0 z-50 bg-white shadow-lg border border-gray-200 rounded-lg p-4 w-80">
              <h4 className="text-sm font-medium mb-2">Linked Repertoire</h4>
              {goal.repertoire && goal.repertoire.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {goal.repertoire.map(rep => (
                    <Badge key={rep.id} className="bg-green-100 text-green-800 flex items-center gap-1">
                      {rep.title} - {rep.artist}
                      <button
                        onClick={() => onUnlinkRepertoireFromGoal(goal.id, rep.id)}
                        className="ml-1 hover:text-green-900"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Input
                type="text"
                placeholder="Search repertoire..."
                value={goalRepertoireSearches[goal.id]?.query || ''}
                onChange={(e) => onGoalRepertoireSearch(goal.id, e.target.value)}
                autoFocus
                className="mb-2"
              />
              {goalRepertoireSearches[goal.id]?.results?.length > 0 && (
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {goalRepertoireSearches[goal.id].results.map(rep => {
                    const alreadyLinked = goal.repertoire?.some(r => r.id === rep.id)
                    return (
                      <button
                        key={rep.id}
                        onClick={() => !alreadyLinked && onLinkRepertoireToGoal(goal.id, rep.id)}
                        disabled={alreadyLinked}
                        className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded ${alreadyLinked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {rep.title} - {rep.artist}
                      </button>
                    )
                  })}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => setGoalRepertoireSearches(prev => ({ ...prev, [goal.id]: { open: false, query: '', results: [] } }))}
              >
                Close
              </Button>
            </div>
          )}

          {/* Linked Content and Repertoire Badges */}
          {((goal.content && goal.content.length > 0) || (goal.repertoire && goal.repertoire.length > 0)) && (
            <div className="flex flex-wrap gap-1 mb-4">
              {goal.content?.map(content => (
                <Badge key={content.id} className="bg-blue-100 text-blue-800 flex items-center gap-1">
                  {content.title}
                  <button
                    onClick={() => onUnlinkContentFromGoal(goal.id, content.id)}
                    className="ml-1 hover:text-blue-900"
                  >
                    ×
                  </button>
                </Badge>
              ))}
              {goal.repertoire?.map(rep => (
                <Badge key={rep.id} className="bg-green-100 text-green-800 flex items-center gap-1">
                  {rep.title} - {rep.artist}
                  <button
                    onClick={() => onUnlinkRepertoireFromGoal(goal.id, rep.id)}
                    className="ml-1 hover:text-green-900"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Logs Section */}
          <div className="space-y-3">
            {displayLogs && displayLogs.length > 0 ? (
              displayLogs.map(log => (
                <LogEntry
                  key={log.id}
                  log={log}
                  logContentSearches={logContentSearches}
                  setLogContentSearches={setLogContentSearches}
                  logRepertoireSearches={logRepertoireSearches}
                  setLogRepertoireSearches={setLogRepertoireSearches}
                  onEditLog={onEditLog}
                  onDeleteLog={onDeleteLog}
                  onLogContentSearch={onLogContentSearch}
                  onLinkContentToLog={onLinkContentToLog}
                  onUnlinkContentFromLog={onUnlinkContentFromLog}
                  onLogRepertoireSearch={onLogRepertoireSearch}
                  onLinkRepertoireToLog={onLinkRepertoireToLog}
                  onUnlinkRepertoireFromLog={onUnlinkRepertoireFromLog}
                  onContentClick={onContentClick}
                  formatLogDateTime={formatLogDateTime}
                />
              ))
            ) : (
              <p className="text-sm text-gray-500 italic pl-4 border-l-2 border-gray-200 py-2">
                {showAllLogs[goal.id] ? 'No logs yet for this goal' : 'No logs for today'}
              </p>
            )}
          </div>

          {/* Show All / Show Less Button */}
          {totalLogs > todaysLogsCount && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllLogs(prev => ({
                  ...prev,
                  [goal.id]: !prev[goal.id]
                }))}
              >
                {showAllLogs[goal.id]
                  ? 'Show Less'
                  : `Show All (${totalLogs})`}
              </Button>
            </div>
          )}

          {/* Add Log Form */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Textarea
              id={`log-input-${goal.id}`}
              placeholder="What did you practice?"
              value={newLogInputs[goal.id] || ''}
              onChange={(e) => setNewLogInputs(prev => ({ ...prev, [goal.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  onAddLog(goal.id)
                }
              }}
              className="bg-gray-50 border border-gray-300 rounded-lg p-2.5 w-full h-9 min-h-9 max-h-9 resize-none overflow-hidden"
            />
          </div>
        </div>
      </details>
    </div>
  )
}

// Log Entry Component
function LogEntry({
  log,
  logContentSearches,
  setLogContentSearches,
  logRepertoireSearches,
  setLogRepertoireSearches,
  onEditLog,
  onDeleteLog,
  onLogContentSearch,
  onLinkContentToLog,
  onUnlinkContentFromLog,
  onLogRepertoireSearch,
  onLinkRepertoireToLog,
  onUnlinkRepertoireFromLog,
  onContentClick,
  formatLogDateTime
}) {
  return (
    <div className="relative">
      {/* Single line with log text, count buttons, and edit icon */}
      <div className="flex items-baseline gap-2 text-sm">
        <span className="text-gray-500 shrink-0 text-xs">{formatLogDateTime(log.date)}</span>
        <span className="flex-1 truncate">{log.entry}</span>

        {/* Circular count buttons and edit icon (right-aligned) */}
        <div className="shrink-0 flex gap-2 items-center">
          {/* Content count button */}
          <button
            onClick={() => setLogContentSearches(prev => ({
              ...prev,
              [log.id]: { open: !prev[log.id]?.open, query: '', results: [] }
            }))}
            className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-medium flex items-center justify-center hover:bg-blue-700"
            title={`Content (${log.content?.length || 0})`}
          >
            {log.content?.length || 0}
          </button>

          {/* Repertoire count button */}
          <button
            onClick={() => setLogRepertoireSearches(prev => ({
              ...prev,
              [log.id]: { open: !prev[log.id]?.open, query: '', results: [] }
            }))}
            className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-medium flex items-center justify-center hover:bg-green-700"
            title={`Repertoire (${log.repertoire?.length || 0})`}
          >
            {log.repertoire?.length || 0}
          </button>

          {/* Edit icon */}
          <button
            onClick={() => onEditLog(log)}
            className="text-gray-600 hover:text-gray-800 p-1"
            title="Edit log"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content Search Dropdown */}
      {logContentSearches[log.id]?.open && (
        <div className="relative z-50 mt-2">
          <div className="absolute top-0 right-0 bg-white shadow-lg border border-gray-200 rounded-lg p-4 w-80">
            <h4 className="text-sm font-medium mb-2">Linked Content</h4>
            {log.content && log.content.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1">
                {log.content.map(content => (
                  <Badge key={content.id} className="bg-blue-100 text-blue-800 flex items-center gap-1 cursor-pointer hover:bg-blue-200" onClick={() => onContentClick(content)}>
                    {content.title}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onUnlinkContentFromLog(log.id, content.id)
                      }}
                      className="ml-1 hover:text-blue-900"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Input
              type="text"
              placeholder="Search content..."
              value={logContentSearches[log.id]?.query || ''}
              onChange={(e) => onLogContentSearch(log.id, e.target.value)}
              autoFocus
            />
            {logContentSearches[log.id]?.results?.length > 0 && (
              <div className="mt-2 max-h-60 overflow-y-auto">
                {logContentSearches[log.id].results.map(content => {
                  const alreadyLinked = log.content?.some(c => c.id === content.id)
                  return (
                    <button
                      key={content.id}
                      onClick={() => !alreadyLinked && onLinkContentToLog(log.id, content.id)}
                      disabled={alreadyLinked}
                      className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded ${alreadyLinked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {content.title}
                    </button>
                  )
                })}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => setLogContentSearches(prev => ({ ...prev, [log.id]: { open: false, query: '', results: [] } }))}
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Repertoire Search Dropdown */}
      {logRepertoireSearches[log.id]?.open && (
        <div className="relative z-50 mt-2">
          <div className="absolute top-0 right-0 bg-white shadow-lg border border-gray-200 rounded-lg p-4 w-80">
            <h4 className="text-sm font-medium mb-2">Linked Repertoire</h4>
            {log.repertoire && log.repertoire.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1">
                {log.repertoire.map(rep => (
                  <Badge key={rep.id} className="bg-green-100 text-green-800 flex items-center gap-1">
                    {rep.title} - {rep.artist}
                    <button
                      onClick={() => onUnlinkRepertoireFromLog(log.id, rep.id)}
                      className="ml-1 hover:text-green-900"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Input
              type="text"
              placeholder="Search repertoire..."
              value={logRepertoireSearches[log.id]?.query || ''}
              onChange={(e) => onLogRepertoireSearch(log.id, e.target.value)}
              autoFocus
            />
            {logRepertoireSearches[log.id]?.results?.length > 0 && (
              <div className="mt-2 max-h-60 overflow-y-auto">
                {logRepertoireSearches[log.id].results.map(rep => {
                  const alreadyLinked = log.repertoire?.some(r => r.id === rep.id)
                  return (
                    <button
                      key={rep.id}
                      onClick={() => !alreadyLinked && onLinkRepertoireToLog(log.id, rep.id)}
                      disabled={alreadyLinked}
                      className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded ${alreadyLinked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {rep.title} - {rep.artist}
                    </button>
                  )
                })}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => setLogRepertoireSearches(prev => ({ ...prev, [log.id]: { open: false, query: '', results: [] } }))}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Log Modal Component
function LogModal({ open, onClose, log, onSave, onDelete }) {
  const [formData, setFormData] = useState({ entry: '', date: '' })

  useEffect(() => {
    if (open && log) {
      setFormData({
        entry: log.entry || '',
        date: log.date?.split('T')[0] || ''
      })
    }
  }, [open, log])

  function handleSave() {
    if (!formData.entry.trim()) {
      alert('Log entry cannot be empty')
      return
    }
    onSave(log.id, formData)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Log</DialogTitle>
          <DialogDescription>Update the details for this log entry.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="entry" className="text-sm font-medium text-gray-700">
              Log Entry <span className="text-red-500">*</span>
            </label>
            <Textarea
              id="entry"
              rows={5}
              value={formData.entry}
              onChange={(e) => setFormData(prev => ({ ...prev, entry: e.target.value }))}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="date" className="text-sm font-medium text-gray-700">
              Date
            </label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center">
          <Button
            variant="destructive"
            onClick={() => onDelete(log.id)}
            className="mr-auto"
          >
            Delete
          </Button>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-primary-600 hover:bg-primary-700"
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
