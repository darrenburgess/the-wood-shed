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
  searchContentForLinking,
  searchRepertoireForLinking,
  linkContentToGoal,
  unlinkContentFromGoal,
  linkRepertoireToLog,
  unlinkRepertoireFromLog,
  fetchTodaySession,
  addGoalToSession
} from '@/lib/queries'
import TopicModal from './TopicModal'
import GoalModal from './GoalModal'
import LogModal from './LogModal'

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

  // UI state
  const [openTopics, setOpenTopics] = useState({})
  const [openGoals, setOpenGoals] = useState({})
  const [openCompletedSections, setOpenCompletedSections] = useState({})
  const [logsToShow, setLogsToShow] = useState({}) // goalId -> number of logs to show

  // Inline form states
  const [newGoalInputs, setNewGoalInputs] = useState({}) // topicId -> text
  const [newLogInputs, setNewLogInputs] = useState({}) // goalId -> text

  // Content/Repertoire search states
  const [contentSearches, setContentSearches] = useState({}) // goalId -> { open, query, results }
  const [repertoireSearches, setRepertoireSearches] = useState({}) // logId -> { open, query, results }

  // Session state
  const [sessionGoalIds, setSessionGoalIds] = useState(new Set())

  // Load topics on mount
  useEffect(() => {
    loadTopics()
    loadTodaySession()
  }, [])

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
      await linkContentToGoal(goalId, contentId)
      // Reload goal content
      const content = await fetchGoalContent(goalId)
      setTopics(prev => prev.map(topic => ({
        ...topic,
        goals: topic.goals.map(g =>
          g.id === goalId ? { ...g, content } : g
        )
      })))
      setContentSearches(prev => ({
        ...prev,
        [goalId]: { open: false, query: '', results: [] }
      }))
    } catch (err) {
      alert('Failed to link content: ' + err.message)
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

  // Repertoire linking handlers
  const handleRepertoireSearch = useCallback(async (logId, query) => {
    setRepertoireSearches(prev => ({
      ...prev,
      [logId]: { ...prev[logId], query }
    }))

    if (query.length < 2) {
      setRepertoireSearches(prev => ({
        ...prev,
        [logId]: { ...prev[logId], results: [] }
      }))
      return
    }

    try {
      const results = await searchRepertoireForLinking(query)
      setRepertoireSearches(prev => ({
        ...prev,
        [logId]: { ...prev[logId], results }
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

  // Session handlers
  const handleAddToSession = async (goalId) => {
    try {
      await addGoalToSession(goalId)
      setSessionGoalIds(prev => new Set([...prev, goalId]))
    } catch (err) {
      alert('Failed to add to session: ' + err.message)
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
          <h1 className="text-3xl font-bold text-gray-900">Topics</h1>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        setEditingTopic(topic)
                        setTopicModalOpen(true)
                      }}
                    >
                      Edit
                    </Button>
                  </summary>

                  {/* Topic Content */}
                  <div className="px-6 py-4">
                    {/* Active Goals */}
                    {activeGoals.map(goal => (
                      <div key={goal.id} className="border-b border-gray-100 last:border-b-0 py-3">
                        <details
                          open={openGoals[goal.id]}
                          onToggle={(e) => setOpenGoals(prev => ({
                            ...prev,
                            [goal.id]: e.target.open
                          }))}
                        >
                          <summary className="flex justify-between items-start gap-2 cursor-pointer list-none">
                            <div className="flex items-start gap-2 flex-1">
                              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <div className="flex-1">
                                <span className="font-medium text-gray-900">
                                  {goal.goal_number}: {goal.description}
                                </span>
                                <span className="text-sm text-gray-500 ml-2">
                                  ({goal.logs?.length || 0} logs)
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.preventDefault()}>
                              {sessionGoalIds.has(goal.id) ? (
                                <button className="text-green-600 cursor-default px-2 py-1" title="In session">
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
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setContentSearches(prev => ({
                                    ...prev,
                                    [goal.id]: { open: !prev[goal.id]?.open, query: '', results: [] }
                                  }))
                                }}
                              >
                                + Content
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingGoal(goal)
                                  setGoalModalOpen(true)
                                }}
                              >
                                Edit
                              </Button>
                            </div>
                          </summary>

                          {/* Goal Content */}
                          <div className="ml-6 mt-3 space-y-4">
                            {/* Content Search Dropdown */}
                            {contentSearches[goal.id]?.open && (
                              <div className="relative z-50">
                                <div className="absolute top-0 left-0 bg-white shadow-lg border border-gray-200 rounded-lg p-4 w-80">
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
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 w-full"
                                    onClick={() => setContentSearches(prev => ({
                                      ...prev,
                                      [goal.id]: { open: false, query: '', results: [] }
                                    }))}
                                  >
                                    Close
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Linked Content */}
                            {goal.content && goal.content.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {goal.content.map(content => (
                                  <Badge key={content.id} className="bg-blue-100 text-blue-800 flex items-center gap-1">
                                    {content.title}
                                    <button
                                      onClick={() => handleUnlinkContent(goal.id, content.id)}
                                      className="ml-1 hover:text-blue-900"
                                    >
                                      ×
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Logs */}
                            {goal.logs && goal.logs.length > 0 ? (
                              <div className="space-y-2">
                                {goal.logs.slice(0, logsToShow[goal.id] || 5).map(log => (
                                  <div key={log.id} className="flex items-start gap-2 text-sm">
                                    <span className="text-gray-500 shrink-0">{formatDate(log.date)}</span>
                                    <span className="flex-1">{log.entry}</span>

                                    {/* Content and Repertoire badges inline */}
                                    {(log.content?.length > 0 || log.repertoire?.length > 0) && (
                                      <span className="shrink-0 flex gap-1 flex-wrap">
                                        {log.content?.map(item => (
                                          <Badge key={item.id} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                            {item.title}
                                          </Badge>
                                        ))}
                                        {log.repertoire?.map(item => (
                                          <Badge key={item.id} variant="secondary" className="text-xs bg-green-100 text-green-800">
                                            {item.title} - {item.artist}
                                          </Badge>
                                        ))}
                                      </span>
                                    )}

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingLog(log)
                                        setLogModalOpen(true)
                                      }}
                                      className="shrink-0"
                                    >
                                      Edit
                                    </Button>
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
                              <p className="text-sm text-gray-500 italic">No logs yet for this goal.</p>
                            )}

                            {/* Add Log Inline Form */}
                            <div className="flex gap-2">
                              <Textarea
                                placeholder="Log your progress..."
                                value={newLogInputs[goal.id] || ''}
                                onChange={(e) => setNewLogInputs(prev => ({
                                  ...prev,
                                  [goal.id]: e.target.value
                                }))}
                                rows={2}
                                className="flex-1"
                              />
                              <Button
                                onClick={() => handleCreateLog(goal.id)}
                                disabled={!newLogInputs[goal.id]?.trim()}
                                className="bg-primary-600 hover:bg-primary-700"
                              >
                                Add Log
                              </Button>
                            </div>
                          </div>
                        </details>
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingGoal(goal)
                                    setGoalModalOpen(true)
                                  }}
                                >
                                  Edit
                                </Button>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}

                    {/* Add Goal Inline Form */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex gap-2">
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
                          className="flex-1"
                        />
                        <Button
                          onClick={() => handleCreateGoal(topic.id)}
                          disabled={!newGoalInputs[topic.id]?.trim()}
                          className="bg-primary-600 hover:bg-primary-700"
                        >
                          Add Goal
                        </Button>
                      </div>
                    </div>
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
    </div>
  )
}
