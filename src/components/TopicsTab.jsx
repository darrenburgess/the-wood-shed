import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  fetchTopicsWithGoalsAndLogs,
  createTopic,
  updateTopic,
  deleteTopic,
  createGoal,
  updateGoal,
  deleteGoal,
  createLog,
  updateLog,
  deleteLog,
  fetchGoalContent,
  fetchGoalRepertoire,
  fetchLogContent,
  fetchLogRepertoire,
  searchContentForLinking,
  searchRepertoireForLinking,
  linkContentToGoal,
  unlinkContentFromGoal,
  linkRepertoireToGoal,
  unlinkRepertoireFromGoal,
  linkContentToLog,
  unlinkContentFromLog,
  linkRepertoireToLog,
  unlinkRepertoireFromLog,
  fetchTodaySession,
  addGoalToSession,
  removeGoalFromSession
} from '@/lib/queries'
import TopicModal from './TopicModal'
import GoalModal from './GoalModal'
import LogModal from './LogModal'
import YouTubeModal from './YouTubeModal'

export default function TopicsTab() {
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modal states
  const [topicModalOpen, setTopicModalOpen] = useState(false)
  const [editingTopic, setEditingTopic] = useState(null)
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [logModalOpen, setLogModalOpen] = useState(false)
  const [editingLog, setEditingLog] = useState(null)
  const [youtubeModalOpen, setYoutubeModalOpen] = useState(false)
  const [selectedYoutubeContent, setSelectedYoutubeContent] = useState(null)

  // UI state with localStorage persistence
  const [openTopics, setOpenTopics] = useState(() => {
    const saved = localStorage.getItem('openTopics')
    return saved ? JSON.parse(saved) : {}
  })
  const [openGoals, setOpenGoals] = useState(() => {
    const saved = localStorage.getItem('openGoals')
    return saved ? JSON.parse(saved) : {}
  })
  const [openCompletedSections, setOpenCompletedSections] = useState({})
  const [logsToShow, setLogsToShow] = useState({}) // goalId -> number of logs to show

  // Inline form states
  const [newGoalInputs, setNewGoalInputs] = useState({}) // topicId -> text
  const [newLogInputs, setNewLogInputs] = useState({}) // goalId -> text

  // Content/Repertoire search states (for goals)
  const [contentSearches, setContentSearches] = useState({}) // goalId -> { open, query, results }
  const [repertoireSearches, setRepertoireSearches] = useState({}) // goalId -> { open, query, results }

  // Content/Repertoire search states (for logs)
  const [logContentSearches, setLogContentSearches] = useState({}) // logId -> { open, query, results }
  const [logRepertoireSearches, setLogRepertoireSearches] = useState({}) // logId -> { open, query, results }

  // Session state
  const [sessionGoalIds, setSessionGoalIds] = useState(new Set())

  // Load topics on mount
  useEffect(() => {
    loadTopics()
    loadTodaySession()
  }, [])

  // Save openTopics to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('openTopics', JSON.stringify(openTopics))
  }, [openTopics])

  // Save openGoals to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('openGoals', JSON.stringify(openGoals))
  }, [openGoals])

  const loadTopics = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchTopicsWithGoalsAndLogs()
      setTopics(data)

      // Initialize logsToShow for all goals (show 5 by default)
      const initialLogsToShow = {}
      data.forEach(topic => {
        topic.goals?.forEach(goal => {
          initialLogsToShow[goal.id] = 5
        })
      })
      setLogsToShow(initialLogsToShow)
    } catch (err) {
      setError('Failed to load topics: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadTodaySession = async () => {
    try {
      const session = await fetchTodaySession()
      if (session && session.session_goals) {
        const goalIds = new Set(session.session_goals.map(sg => sg.goal_id))
        setSessionGoalIds(goalIds)
      }
    } catch (err) {
      console.error('Error loading session:', err)
    }
  }

  // Topic CRUD handlers
  const handleCreateTopic = async (title) => {
    try {
      const newTopic = await createTopic(title)
      setTopics(prev => [...prev, newTopic])
      setOpenTopics(prev => ({ ...prev, [newTopic.id]: true }))
    } catch (err) {
      alert('Failed to create topic: ' + err.message)
    }
  }

  const handleUpdateTopic = async (title) => {
    try {
      await updateTopic(editingTopic.id, title)
      setTopics(prev => prev.map(t =>
        t.id === editingTopic.id ? { ...t, title } : t
      ))
    } catch (err) {
      alert('Failed to update topic: ' + err.message)
    }
  }

  const handleDeleteTopic = async (topicId) => {
    try {
      await deleteTopic(topicId)
      setTopics(prev => prev.filter(t => t.id !== topicId))
    } catch (err) {
      alert('Failed to delete topic: ' + err.message)
    }
  }

  // Goal CRUD handlers
  const handleCreateGoal = async (topicId) => {
    const description = newGoalInputs[topicId]?.trim()
    if (!description) return

    try {
      const topic = topics.find(t => t.id === topicId)
      const nextSubNumber = topic.goals.length > 0
        ? Math.max(...topic.goals.map(g => Number(g.goal_number.split('.')[1] || 0))) + 1
        : 1

      const newGoal = await createGoal(topicId, topic.topic_number, description, nextSubNumber)

      setTopics(prev => prev.map(t => {
        if (t.id === topicId) {
          const updatedGoals = [newGoal, ...t.goals].sort((a, b) => {
            const aNum = Number(a.goal_number.split('.')[1] || 0)
            const bNum = Number(b.goal_number.split('.')[1] || 0)
            return bNum - aNum
          })
          return { ...t, goals: updatedGoals }
        }
        return t
      }))

      setNewGoalInputs(prev => ({ ...prev, [topicId]: '' }))
      setOpenGoals(prev => ({ ...prev, [newGoal.id]: true }))
      setLogsToShow(prev => ({ ...prev, [newGoal.id]: 5 }))
    } catch (err) {
      alert('Failed to create goal: ' + err.message)
    }
  }

  const handleUpdateGoal = async (goalId, updateData) => {
    try {
      await updateGoal(goalId, updateData)
      setTopics(prev => prev.map(topic => ({
        ...topic,
        goals: topic.goals.map(g =>
          g.id === goalId ? { ...g, ...updateData } : g
        )
      })))
    } catch (err) {
      alert('Failed to update goal: ' + err.message)
    }
  }

  const handleDeleteGoal = async (goalId) => {
    try {
      await deleteGoal(goalId)
      setTopics(prev => prev.map(topic => ({
        ...topic,
        goals: topic.goals.filter(g => g.id !== goalId)
      })))
    } catch (err) {
      alert('Failed to delete goal: ' + err.message)
    }
  }

  // Log CRUD handlers
  const handleCreateLog = async (goalId) => {
    const entry = newLogInputs[goalId]?.trim()
    if (!entry) return

    try {
      const today = new Date().toISOString().split('T')[0]
      const newLog = await createLog(goalId, entry, today)

      setTopics(prev => prev.map(topic => ({
        ...topic,
        goals: topic.goals.map(g => {
          if (g.id === goalId) {
            return { ...g, logs: [newLog, ...(g.logs || [])] }
          }
          return g
        })
      })))

      setNewLogInputs(prev => ({ ...prev, [goalId]: '' }))
    } catch (err) {
      alert('Failed to create log: ' + err.message)
    }
  }

  const handleUpdateLog = async (logId, updateData) => {
    try {
      await updateLog(logId, updateData)
      setTopics(prev => prev.map(topic => ({
        ...topic,
        goals: topic.goals.map(g => ({
          ...g,
          logs: g.logs?.map(log =>
            log.id === logId ? { ...log, ...updateData } : log
          )
        }))
      })))
    } catch (err) {
      alert('Failed to update log: ' + err.message)
    }
  }

  const handleDeleteLog = async (logId) => {
    try {
      await deleteLog(logId)
      setTopics(prev => prev.map(topic => ({
        ...topic,
        goals: topic.goals.map(g => ({
          ...g,
          logs: g.logs?.filter(log => log.id !== logId)
        }))
      })))
    } catch (err) {
      alert('Failed to delete log: ' + err.message)
    }
  }

  // Handle content click
  const handleContentClick = (content) => {
    // Check if URL is YouTube (regardless of type field)
    const isYouTube = content.url && (
      content.url.includes('youtube.com') ||
      content.url.includes('youtu.be')
    )

    if (isYouTube) {
      setSelectedYoutubeContent(content)
      setYoutubeModalOpen(true)
    } else {
      window.open(content.url, '_blank')
    }
  }

  // Content linking handlers
  const handleContentSearch = useCallback(async (goalId, query) => {
    setContentSearches(prev => ({
      ...prev,
      [goalId]: { ...prev[goalId], query }
    }))

    if (query.length < 2) {
      setContentSearches(prev => ({
        ...prev,
        [goalId]: { ...prev[goalId], results: [] }
      }))
      return
    }

    try {
      const results = await searchContentForLinking(query)
      setContentSearches(prev => ({
        ...prev,
        [goalId]: { ...prev[goalId], results }
      }))
    } catch (err) {
      console.error('Content search error:', err)
    }
  }, [])

  const handleLinkContent = async (goalId, contentId) => {
    try {
      // Get the content item from search results
      const contentItem = contentSearches[goalId]?.results?.find(c => c.id === contentId)
      if (!contentItem) return

      // Optimistically update UI
      setTopics(prev => prev.map(topic => ({
        ...topic,
        goals: topic.goals.map(g =>
          g.id === goalId
            ? { ...g, content: [...(g.content || []), contentItem] }
            : g
        )
      })))

      // Close dropdown
      setContentSearches(prev => ({
        ...prev,
        [goalId]: { open: false, query: '', results: [] }
      }))

      // Update database in background
      await linkContentToGoal(goalId, contentId)
    } catch (err) {
      alert('Failed to link content: ' + err.message)
      // Reload on error to sync state
      loadTopics()
    }
  }

  const handleUnlinkContent = async (goalId, contentId) => {
    try {
      await unlinkContentFromGoal(goalId, contentId)
      setTopics(prev => prev.map(topic => ({
        ...topic,
        goals: topic.goals.map(g =>
          g.id === goalId
            ? { ...g, content: g.content?.filter(c => c.id !== contentId) }
            : g
        )
      })))
    } catch (err) {
      alert('Failed to unlink content: ' + err.message)
    }
  }

  // Repertoire linking to goals handlers
  const handleLinkRepertoireToGoal = async (goalId, repertoireId, repertoireData) => {
    try {
      // Get the repertoire item from search results
      const repertoireItem = repertoireSearches[goalId]?.results?.find(r => r.id === repertoireId)
      if (!repertoireItem) return

      // Optimistically update UI
      setTopics(prev => prev.map(topic => ({
        ...topic,
        goals: topic.goals.map(g =>
          g.id === goalId
            ? { ...g, repertoire: [...(g.repertoire || []), repertoireItem] }
            : g
        )
      })))

      // Close dropdown
      setRepertoireSearches(prev => ({
        ...prev,
        [goalId]: { open: false, query: '', results: [] }
      }))

      // Update database in background
      await linkRepertoireToGoal(goalId, repertoireId)
    } catch (err) {
      alert('Failed to link repertoire: ' + err.message)
      // Reload on error to sync state
      loadTopics()
    }
  }

  const handleUnlinkRepertoireFromGoal = async (goalId, repertoireId) => {
    try {
      await unlinkRepertoireFromGoal(goalId, repertoireId)
      setTopics(prev => prev.map(topic => ({
        ...topic,
        goals: topic.goals.map(g =>
          g.id === goalId
            ? { ...g, repertoire: g.repertoire?.filter(r => r.id !== repertoireId) }
            : g
        )
      })))
    } catch (err) {
      alert('Failed to unlink repertoire: ' + err.message)
    }
  }

  // Repertoire linking handlers (works for both goals and logs)
  const handleRepertoireSearch = useCallback(async (entityId, query) => {
    setRepertoireSearches(prev => ({
      ...prev,
      [entityId]: { ...prev[entityId], query }
    }))

    if (query.length < 2) {
      setRepertoireSearches(prev => ({
        ...prev,
        [entityId]: { ...prev[entityId], results: [] }
      }))
      return
    }

    try {
      const results = await searchRepertoireForLinking(query)
      setRepertoireSearches(prev => ({
        ...prev,
        [entityId]: { ...prev[entityId], results }
      }))
    } catch (err) {
      console.error('Repertoire search error:', err)
    }
  }, [])

  const handleLinkRepertoire = async (logId, repertoireId, repertoireData) => {
    try {
      await linkRepertoireToLog(logId, repertoireId)
      setTopics(prev => prev.map(topic => ({
        ...topic,
        goals: topic.goals.map(g => ({
          ...g,
          logs: g.logs?.map(log =>
            log.id === logId
              ? { ...log, repertoire: [...(log.repertoire || []), repertoireData] }
              : log
          )
        }))
      })))
      setRepertoireSearches(prev => ({
        ...prev,
        [logId]: { open: false, query: '', results: [] }
      }))
    } catch (err) {
      alert('Failed to link repertoire: ' + err.message)
    }
  }

  const handleUnlinkRepertoire = async (logId, repertoireId) => {
    try {
      await unlinkRepertoireFromLog(logId, repertoireId)
      setTopics(prev => prev.map(topic => ({
        ...topic,
        goals: topic.goals.map(g => ({
          ...g,
          logs: g.logs?.map(log =>
            log.id === logId
              ? { ...log, repertoire: log.repertoire?.filter(r => r.id !== repertoireId) }
              : log
          )
        }))
      })))
    } catch (err) {
      alert('Failed to unlink repertoire: ' + err.message)
    }
  }

  // Log-level content linking handlers
  const handleLogContentSearch = useCallback(async (logId, query) => {
    setLogContentSearches(prev => ({
      ...prev,
      [logId]: { ...prev[logId], query }
    }))

    if (query.length < 2) {
      setLogContentSearches(prev => ({
        ...prev,
        [logId]: { ...prev[logId], results: [] }
      }))
      return
    }

    try {
      const results = await searchContentForLinking(query)
      setLogContentSearches(prev => ({
        ...prev,
        [logId]: { ...prev[logId], results }
      }))
    } catch (err) {
      console.error('Content search error:', err)
    }
  }, [])

  const handleLinkContentToLog = async (logId, contentId) => {
    try {
      // Get the content item from search results
      const contentItem = logContentSearches[logId]?.results?.find(c => c.id === contentId)
      if (!contentItem) return

      // Optimistically update UI
      setTopics(prev => prev.map(topic => ({
        ...topic,
        goals: topic.goals.map(g => ({
          ...g,
          logs: g.logs?.map(log =>
            log.id === logId
              ? { ...log, content: [...(log.content || []), contentItem] }
              : log
          )
        }))
      })))

      // Close dropdown
      setLogContentSearches(prev => ({
        ...prev,
        [logId]: { open: false, query: '', results: [] }
      }))

      // Update database in background
      await linkContentToLog(logId, contentId)
    } catch (err) {
      alert('Failed to link content: ' + err.message)
      // Reload on error to sync state
      loadTopics()
    }
  }

  const handleUnlinkContentFromLog = async (logId, contentId) => {
    try {
      await unlinkContentFromLog(logId, contentId)
      setTopics(prev => prev.map(topic => ({
        ...topic,
        goals: topic.goals.map(g => ({
          ...g,
          logs: g.logs?.map(log =>
            log.id === logId
              ? { ...log, content: log.content?.filter(c => c.id !== contentId) }
              : log
          )
        }))
      })))
    } catch (err) {
      alert('Failed to unlink content: ' + err.message)
    }
  }

  const handleLogRepertoireSearch = useCallback(async (logId, query) => {
    setLogRepertoireSearches(prev => ({
      ...prev,
      [logId]: { ...prev[logId], query }
    }))

    if (query.length < 2) {
      setLogRepertoireSearches(prev => ({
        ...prev,
        [logId]: { ...prev[logId], results: [] }
      }))
      return
    }

    try {
      const results = await searchRepertoireForLinking(query)
      setLogRepertoireSearches(prev => ({
        ...prev,
        [logId]: { ...prev[logId], results }
      }))
    } catch (err) {
      console.error('Repertoire search error:', err)
    }
  }, [])

  const handleLinkRepertoireToLog = async (logId, repertoireId) => {
    try {
      // Get the repertoire item from search results
      const repertoireItem = logRepertoireSearches[logId]?.results?.find(r => r.id === repertoireId)
      if (!repertoireItem) return

      // Optimistically update UI
      setTopics(prev => prev.map(topic => ({
        ...topic,
        goals: topic.goals.map(g => ({
          ...g,
          logs: g.logs?.map(log =>
            log.id === logId
              ? { ...log, repertoire: [...(log.repertoire || []), repertoireItem] }
              : log
          )
        }))
      })))

      // Close dropdown
      setLogRepertoireSearches(prev => ({
        ...prev,
        [logId]: { open: false, query: '', results: [] }
      }))

      // Update database in background
      await linkRepertoireToLog(logId, repertoireId)
    } catch (err) {
      alert('Failed to link repertoire: ' + err.message)
      // Reload on error to sync state
      loadTopics()
    }
  }

  const handleUnlinkRepertoireFromLog = async (logId, repertoireId) => {
    try {
      await unlinkRepertoireFromLog(logId, repertoireId)
      setTopics(prev => prev.map(topic => ({
        ...topic,
        goals: topic.goals.map(g => ({
          ...g,
          logs: g.logs?.map(log =>
            log.id === logId
              ? { ...log, repertoire: log.repertoire?.filter(r => r.id !== repertoireId) }
              : log
          )
        }))
      })))
    } catch (err) {
      alert('Failed to unlink repertoire: ' + err.message)
    }
  }

  // Session handlers
  const handleAddToSession = async (goalId) => {
    try {
      await addGoalToSession(goalId)
      setSessionGoalIds(prev => new Set([...prev, goalId]))
    } catch (err) {
      alert('Failed to add to session: ' + err.message)
    }
  }

  const handleRemoveFromSession = async (goalId) => {
    try {
      await removeGoalFromSession(goalId)
      setSessionGoalIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(goalId)
        return newSet
      })
    } catch (err) {
      alert('Failed to remove from session: ' + err.message)
    }
  }

  // Expand/Collapse handlers
  const handleExpandAll = () => {
    const allTopicsOpen = {}
    const allGoalsOpen = {}
    topics.forEach(topic => {
      allTopicsOpen[topic.id] = true
      topic.goals?.forEach(goal => {
        if (!goal.is_complete) {
          allGoalsOpen[goal.id] = true
        }
      })
    })
    setOpenTopics(allTopicsOpen)
    setOpenGoals(allGoalsOpen)
  }

  const handleCollapseAll = () => {
    setOpenTopics({})
    setOpenGoals({})
  }

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Separate active and completed goals
  const getActiveGoals = (goals) => goals?.filter(g => !g.is_complete) || []
  const getCompletedGoals = (goals) => goals?.filter(g => g.is_complete) || []

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Topics</h1>
            <p className="text-sm text-gray-500 mt-1">Track your areas of practice focus</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExpandAll}>
              Expand All
            </Button>
            <Button variant="outline" onClick={handleCollapseAll}>
              Collapse All
            </Button>
            <Button
              onClick={() => {
                setEditingTopic(null)
                setTopicModalOpen(true)
              }}
              className="bg-primary-600 hover:bg-primary-700"
            >
              New Topic
            </Button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="text-sm font-medium text-gray-500">Loading your topics...</span>
          </div>
        </div>
      ) : topics.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <div>
              <p className="font-medium text-gray-900">No topics yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Create your first topic to organize your practice goals.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {topics.map(topic => {
            const activeGoals = getActiveGoals(topic.goals)
            const completedGoals = getCompletedGoals(topic.goals)

            return (
              <div key={topic.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Topic Header */}
                <details
                  open={openTopics[topic.id]}
                  onToggle={(e) => setOpenTopics(prev => ({
                    ...prev,
                    [topic.id]: e.target.open
                  }))}
                >
                  <summary className="px-6 py-4 bg-gray-50 border-b border-gray-200 cursor-pointer flex justify-between items-center list-none">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <h2 className="text-xl font-bold text-gray-900">
                        Topic {topic.topic_number}: {topic.title}
                      </h2>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        setEditingTopic(topic)
                        setTopicModalOpen(true)
                      }}
                      className="text-gray-600 hover:text-gray-800 p-1"
                      title="Edit topic"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </summary>

                  {/* Topic Content */}
                  <div className="px-6 py-4">
                    {/* Add Goal Inline Form */}
                    <div className="mb-4">
                      <Input
                        type="text"
                        placeholder="New goal description..."
                        value={newGoalInputs[topic.id] || ''}
                        onChange={(e) => setNewGoalInputs(prev => ({
                          ...prev,
                          [topic.id]: e.target.value
                        }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateGoal(topic.id)
                          }
                        }}
                        className="w-full"
                      />
                    </div>

                    {/* Active Goals */}
                    {activeGoals.map(goal => (
                      <div key={goal.id} className="border-b border-gray-100 last:border-b-0 py-3 relative">
                        <details
                          open={openGoals[goal.id]}
                          onToggle={(e) => {
                            e.stopPropagation()
                            setOpenGoals(prev => ({
                              ...prev,
                              [goal.id]: e.target.open
                            }))
                          }}
                        >
                          <summary className="flex justify-between items-center gap-3 cursor-pointer list-none" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-gray-900">
                                  {goal.goal_number}: {goal.description}
                                </span>
                                <span className="text-sm text-gray-500 ml-2">
                                  ({goal.logs?.length || 0} logs)
                                </span>
                              </div>
                            </div>
                            {/* Linked Content and Repertoire Badges */}
                            {((goal.content && goal.content.length > 0) || (goal.repertoire && goal.repertoire.length > 0)) && (
                              <div className="flex flex-wrap gap-1 items-center" onClick={(e) => e.stopPropagation()}>
                                {goal.content?.map(content => (
                                  <Badge key={content.id} className="bg-blue-100 text-blue-800 flex items-center gap-1 cursor-pointer hover:bg-blue-200" onClick={() => handleContentClick(content)}>
                                    {content.title}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleUnlinkContent(goal.id, content.id)
                                      }}
                                      className="ml-1 hover:text-blue-900"
                                    >
                                      ×
                                    </button>
                                  </Badge>
                                ))}
                                {goal.repertoire?.map(rep => (
                                  <Badge key={rep.id} className="bg-green-100 text-green-800 flex items-center gap-1">
                                    {rep.title}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleUnlinkRepertoireFromGoal(goal.id, rep.id)
                                      }}
                                      className="ml-1 hover:text-green-900"
                                    >
                                      ×
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-2 flex-shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                              {sessionGoalIds.has(goal.id) ? (
                                <button
                                  onClick={() => handleRemoveFromSession(goal.id)}
                                  className="text-green-600 hover:text-green-700 px-2 py-1 cursor-pointer"
                                  title="Remove from session"
                                >
                                  ✓
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleAddToSession(goal.id)}
                                  className="text-blue-600 hover:text-blue-700 px-2 py-1"
                                  title="Add to session"
                                >
                                  +
                                </button>
                              )}
                              {/* Content count button */}
                              <button
                                onClick={() => setContentSearches(prev => ({
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
                                onClick={() => setRepertoireSearches(prev => ({
                                  ...prev,
                                  [goal.id]: { open: !prev[goal.id]?.open, query: '', results: [] }
                                }))}
                                className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-medium flex items-center justify-center hover:bg-green-700"
                                title={`Repertoire (${goal.repertoire?.length || 0})`}
                              >
                                {goal.repertoire?.length || 0}
                              </button>

                              <button
                                onClick={() => {
                                  setEditingGoal(goal)
                                  setGoalModalOpen(true)
                                }}
                                className="text-gray-600 hover:text-gray-800 p-1"
                                title="Edit goal"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            </div>
                          </summary>

                          {/* Goal Content */}
                          <div className="ml-6 mt-3 space-y-4">

                            {/* Add Log Inline Form */}
                            <Textarea
                              placeholder="Log your progress..."
                              value={newLogInputs[goal.id] || ''}
                              onChange={(e) => setNewLogInputs(prev => ({
                                ...prev,
                                [goal.id]: e.target.value
                              }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  handleCreateLog(goal.id)
                                }
                              }}
                              className="bg-gray-50 border border-gray-300 rounded-lg p-2.5 w-full h-9 min-h-9 max-h-9 resize-none overflow-hidden"
                            />

                            {/* Logs */}
                            {goal.logs && goal.logs.length > 0 ? (
                              <div className="space-y-2 mt-3">
                                {goal.logs.slice(0, logsToShow[goal.id] || 5).map(log => (
                                  <div key={log.id} className="relative">
                                    <div className="flex items-start gap-2 text-sm">
                                      <span className="text-gray-500 shrink-0">{formatDate(log.date)}</span>
                                      <span className="flex-1">{log.entry}</span>

                                      {/* Content and Repertoire inline chips */}
                                      {(log.content?.length > 0 || log.repertoire?.length > 0) && (
                                        <span className="shrink-0 flex gap-1 flex-wrap">
                                          {log.content?.map((item) => (
                                            <Badge key={item.id} className="bg-blue-100 text-blue-800 text-xs cursor-pointer hover:bg-blue-200" onClick={() => handleContentClick(item)}>
                                              {item.title}
                                            </Badge>
                                          ))}
                                          {log.repertoire?.map((item) => (
                                            <Badge key={item.id} className="bg-green-100 text-green-800 text-xs">
                                              {item.title}
                                            </Badge>
                                          ))}
                                        </span>
                                      )}

                                      {/* Circular count buttons for content and repertoire */}
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

                                        <button
                                          onClick={() => {
                                            setEditingLog(log)
                                            setLogModalOpen(true)
                                          }}
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
                                              {log.content.map(item => (
                                                <Badge key={item.id} className="bg-blue-100 text-blue-800 flex items-center gap-1">
                                                  {item.title}
                                                  <button onClick={() => handleUnlinkContentFromLog(log.id, item.id)}
                                                    className="ml-1 hover:text-blue-900">×</button>
                                                </Badge>
                                              ))}
                                            </div>
                                          )}
                                          <Input
                                            type="text"
                                            placeholder="Search content..."
                                            value={logContentSearches[log.id]?.query || ''}
                                            onChange={(e) => handleLogContentSearch(log.id, e.target.value)}
                                            autoFocus
                                          />
                                          {logContentSearches[log.id]?.results?.length > 0 && (
                                            <div className="mt-2 max-h-60 overflow-y-auto">
                                              {logContentSearches[log.id].results.map(content => {
                                                const alreadyLinked = log.content?.some(c => c.id === content.id)
                                                return (
                                                  <button
                                                    key={content.id}
                                                    onClick={() => !alreadyLinked && handleLinkContentToLog(log.id, content.id)}
                                                    disabled={alreadyLinked}
                                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded ${alreadyLinked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                  >
                                                    {content.title}
                                                  </button>
                                                )
                                              })}
                                            </div>
                                          )}
                                          <Button variant="outline" size="sm" className="mt-2 w-full"
                                            onClick={() => setLogContentSearches(prev => ({
                                              ...prev,
                                              [log.id]: { open: false, query: '', results: [] }
                                            }))}>
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
                                              {log.repertoire.map(item => (
                                                <Badge key={item.id} className="bg-green-100 text-green-800 flex items-center gap-1">
                                                  {item.title} - {item.artist}
                                                  <button onClick={() => handleUnlinkRepertoireFromLog(log.id, item.id)}
                                                    className="ml-1 hover:text-green-900">×</button>
                                                </Badge>
                                              ))}
                                            </div>
                                          )}
                                          <Input
                                            type="text"
                                            placeholder="Search repertoire..."
                                            value={logRepertoireSearches[log.id]?.query || ''}
                                            onChange={(e) => handleLogRepertoireSearch(log.id, e.target.value)}
                                            autoFocus
                                          />
                                          {logRepertoireSearches[log.id]?.results?.length > 0 && (
                                            <div className="mt-2 max-h-60 overflow-y-auto">
                                              {logRepertoireSearches[log.id].results.map(rep => {
                                                const alreadyLinked = log.repertoire?.some(r => r.id === rep.id)
                                                return (
                                                  <button
                                                    key={rep.id}
                                                    onClick={() => !alreadyLinked && handleLinkRepertoireToLog(log.id, rep.id)}
                                                    disabled={alreadyLinked}
                                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded ${alreadyLinked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                  >
                                                    {rep.title} - {rep.artist}
                                                  </button>
                                                )
                                              })}
                                            </div>
                                          )}
                                          <Button variant="outline" size="sm" className="mt-2 w-full"
                                            onClick={() => setLogRepertoireSearches(prev => ({
                                              ...prev,
                                              [log.id]: { open: false, query: '', results: [] }
                                            }))}>
                                            Close
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}

                                {/* Show All / Show Less */}
                                {goal.logs.length > 5 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setLogsToShow(prev => ({
                                      ...prev,
                                      [goal.id]: prev[goal.id] === 5 ? goal.logs.length : 5
                                    }))}
                                  >
                                    {logsToShow[goal.id] === 5
                                      ? `Show All (${goal.logs.length})`
                                      : 'Show Less'}
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 italic mt-3">No logs yet for this goal.</p>
                            )}
                          </div>
                        </details>

                        {/* Content Search Dropdown - positioned relative to goal wrapper */}
                        {contentSearches[goal.id]?.open && (
                          <div className="absolute top-8 right-0 z-50 bg-white shadow-lg border border-gray-200 rounded-lg p-4 w-80">
                            <h4 className="text-sm font-medium mb-2">Linked Content</h4>
                            {goal.content && goal.content.length > 0 && (
                              <div className="mb-3 flex flex-wrap gap-1">
                                {goal.content.map(item => (
                                  <Badge key={item.id} className="bg-blue-100 text-blue-800 flex items-center gap-1">
                                    {item.title}
                                    <button onClick={() => handleUnlinkContent(goal.id, item.id)}
                                      className="ml-1 hover:text-blue-900">×</button>
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <Input
                              type="text"
                              placeholder="Search content..."
                              value={contentSearches[goal.id]?.query || ''}
                              onChange={(e) => handleContentSearch(goal.id, e.target.value)}
                              autoFocus
                            />
                            {contentSearches[goal.id]?.results?.length > 0 && (
                              <div className="mt-2 max-h-60 overflow-y-auto">
                                {contentSearches[goal.id].results.map(content => {
                                  const alreadyLinked = goal.content?.some(c => c.id === content.id)
                                  return (
                                    <button
                                      key={content.id}
                                      onClick={() => !alreadyLinked && handleLinkContent(goal.id, content.id)}
                                      disabled={alreadyLinked}
                                      className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded ${alreadyLinked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      {content.title}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                            <Button variant="outline" size="sm" className="mt-2 w-full"
                              onClick={() => setContentSearches(prev => ({
                                ...prev,
                                [goal.id]: { open: false, query: '', results: [] }
                              }))}>
                              Close
                            </Button>
                          </div>
                        )}

                        {/* Repertoire Search Dropdown - positioned relative to goal wrapper */}
                        {repertoireSearches[goal.id]?.open && (
                          <div className="absolute top-8 right-0 z-50 bg-white shadow-lg border border-gray-200 rounded-lg p-4 w-80">
                            <h4 className="text-sm font-medium mb-2">Linked Repertoire</h4>
                            {goal.repertoire && goal.repertoire.length > 0 && (
                              <div className="mb-3 flex flex-wrap gap-1">
                                {goal.repertoire.map(item => (
                                  <Badge key={item.id} className="bg-green-100 text-green-800 flex items-center gap-1">
                                    {item.title} - {item.artist}
                                    <button onClick={() => handleUnlinkRepertoireFromGoal(goal.id, item.id)}
                                      className="ml-1 hover:text-green-900">×</button>
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <Input
                              type="text"
                              placeholder="Search repertoire..."
                              value={repertoireSearches[goal.id]?.query || ''}
                              onChange={(e) => handleRepertoireSearch(goal.id, e.target.value)}
                              autoFocus
                            />
                            {repertoireSearches[goal.id]?.results?.length > 0 && (
                              <div className="mt-2 max-h-60 overflow-y-auto">
                                {repertoireSearches[goal.id].results.map(rep => {
                                  const alreadyLinked = goal.repertoire?.some(r => r.id === rep.id)
                                  return (
                                    <button
                                      key={rep.id}
                                      onClick={() => !alreadyLinked && handleLinkRepertoireToGoal(goal.id, rep.id, rep)}
                                      disabled={alreadyLinked}
                                      className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded ${alreadyLinked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      {rep.title} - {rep.artist}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                            <Button variant="outline" size="sm" className="mt-2 w-full"
                              onClick={() => setRepertoireSearches(prev => ({
                                ...prev,
                                [goal.id]: { open: false, query: '', results: [] }
                              }))}>
                              Close
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Completed Goals Section */}
                    {completedGoals.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <details
                          open={openCompletedSections[topic.id]}
                          onToggle={(e) => setOpenCompletedSections(prev => ({
                            ...prev,
                            [topic.id]: e.target.open
                          }))}
                        >
                          <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium text-gray-600 list-none">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            Completed Goals ({completedGoals.length})
                          </summary>
                          <div className="ml-6 mt-2 space-y-2">
                            {completedGoals.map(goal => (
                              <div key={goal.id} className="flex justify-between items-center text-sm text-gray-600 py-1">
                                <span>
                                  {goal.goal_number}: {goal.description} ({goal.logs?.length || 0} logs)
                                  {goal.date_completed && (
                                    <span className="ml-2 text-xs">
                                      (Completed: {formatDate(goal.date_completed)})
                                    </span>
                                  )}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingGoal(goal)
                                    setGoalModalOpen(true)
                                  }}
                                  className="text-gray-600 hover:text-gray-800 p-1"
                                  title="Edit goal"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <TopicModal
        open={topicModalOpen}
        onClose={() => {
          setTopicModalOpen(false)
          setEditingTopic(null)
        }}
        topicData={editingTopic}
        onSave={editingTopic ? handleUpdateTopic : handleCreateTopic}
        onDelete={handleDeleteTopic}
      />

      <GoalModal
        open={goalModalOpen}
        onClose={() => {
          setGoalModalOpen(false)
          setEditingGoal(null)
        }}
        goalData={editingGoal}
        onSave={handleUpdateGoal}
        onDelete={handleDeleteGoal}
      />

      <LogModal
        open={logModalOpen}
        onClose={() => {
          setLogModalOpen(false)
          setEditingLog(null)
        }}
        logData={editingLog}
        onSave={handleUpdateLog}
        onDelete={handleDeleteLog}
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
