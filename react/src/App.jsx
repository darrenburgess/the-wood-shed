import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import PracticeTodayTab from './components/PracticeTodayTab'
import ContentTab from './components/ContentTab'
import RepertoireTab from './components/RepertoireTab'
import LogsTab from './components/LogsTab'
import TopicsTab from './components/TopicsTab'
import Auth from './components/Auth'
import { Button } from '@/components/ui/button'

function AppContent() {
  const { user, loading, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('practice') // 'practice', 'content', 'repertoire', 'logs', or 'topics'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">The Wood Shed</h1>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        </div>
        {/* Tab Navigation */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'practice' ? 'default' : 'outline'}
            onClick={() => setActiveTab('practice')}
            className={activeTab === 'practice' ? 'bg-primary-600' : ''}
          >
            Practice Today
          </Button>
          <Button
            variant={activeTab === 'topics' ? 'default' : 'outline'}
            onClick={() => setActiveTab('topics')}
            className={activeTab === 'topics' ? 'bg-primary-600' : ''}
          >
            Topics
          </Button>
          <Button
            variant={activeTab === 'content' ? 'default' : 'outline'}
            onClick={() => setActiveTab('content')}
            className={activeTab === 'content' ? 'bg-primary-600' : ''}
          >
            Content
          </Button>
          <Button
            variant={activeTab === 'repertoire' ? 'default' : 'outline'}
            onClick={() => setActiveTab('repertoire')}
            className={activeTab === 'repertoire' ? 'bg-primary-600' : ''}
          >
            Repertoire
          </Button>
          <Button
            variant={activeTab === 'logs' ? 'default' : 'outline'}
            onClick={() => setActiveTab('logs')}
            className={activeTab === 'logs' ? 'bg-primary-600' : ''}
          >
            Logs
          </Button>
        </div>
      </div>
      {activeTab === 'practice' && <PracticeTodayTab />}
      {activeTab === 'topics' && <TopicsTab />}
      {activeTab === 'content' && <ContentTab />}
      {activeTab === 'repertoire' && <RepertoireTab />}
      {activeTab === 'logs' && <LogsTab />}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
