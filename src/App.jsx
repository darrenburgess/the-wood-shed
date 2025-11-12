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
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo/Title Section */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">The Wood Shed</h1>
          <p className="text-xs text-gray-500 mt-1">Practice Journal</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('practice')}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg w-full transition-colors ${
              activeTab === 'practice'
                ? 'text-white bg-primary-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Practice Today
          </button>
          <button
            onClick={() => setActiveTab('topics')}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg w-full transition-colors ${
              activeTab === 'topics'
                ? 'text-white bg-primary-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Topics
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg w-full transition-colors ${
              activeTab === 'logs'
                ? 'text-white bg-primary-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Logs
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg w-full transition-colors ${
              activeTab === 'content'
                ? 'text-white bg-primary-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Content
          </button>
          <button
            onClick={() => setActiveTab('repertoire')}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg w-full transition-colors ${
              activeTab === 'repertoire'
                ? 'text-white bg-primary-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            Repertoire
          </button>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-semibold text-sm">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={signOut}
            className="w-full"
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {activeTab === 'practice' && <PracticeTodayTab />}
        {activeTab === 'topics' && <TopicsTab />}
        {activeTab === 'content' && <ContentTab />}
        {activeTab === 'repertoire' && <RepertoireTab />}
        {activeTab === 'logs' && <LogsTab />}
      </div>
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
