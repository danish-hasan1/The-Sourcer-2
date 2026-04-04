import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  Search, GitBranch, FileText, BarChart2, Settings,
  Users, LogOut, ChevronDown, Zap, LayoutDashboard
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useAppStore } from '../store/appStore'
import clsx from 'clsx'

const NAV = [
  { section: 'WORKSPACE' },
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/source',    icon: Search,          label: 'Source Candidates' },
  { to: '/app/pipeline',  icon: GitBranch,       label: 'Pipeline', badge: true },
  { to: '/app/saved-jds', icon: FileText,        label: 'Saved JDs' },
  { section: 'ANALYTICS' },
  { to: '/app/reports',   icon: BarChart2,       label: 'Reports' },
  { section: 'ADMIN' },
  { to: '/app/users',     icon: Users,           label: 'Users', adminOnly: true },
  { to: '/app/settings',  icon: Settings,        label: 'Settings' },
]

export default function Layout() {
  const { user, logout, isAdmin } = useAuthStore()
  const navigate = useNavigate()
  const modelOverride = useAppStore(s => s.modelOverride)
  const setModelOverride = useAppStore(s => s.setModelOverride)

  const models = ['anthropic', 'openai', 'groq', 'google']
  const currentModel = modelOverride || 'anthropic'

  const modelColors = {
    anthropic: 'bg-amber-100 text-amber-700',
    openai:    'bg-green-100 text-green-700',
    groq:      'bg-purple-100 text-purple-700',
    google:    'bg-blue-100 text-blue-700',
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-[224px] flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap size={15} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 leading-tight">TalentAI</div>
            <div className="text-[10px] text-gray-400 leading-tight">Sourcing Platform</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto">
          {NAV.map((item, i) => {
            if (item.section) return (
              <div key={i} className="text-[10px] font-medium text-gray-400 px-2 pt-4 pb-1 tracking-widest">
                {item.section}
              </div>
            )
            if (item.adminOnly && !isAdmin()) return null
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => clsx(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] mb-0.5 transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-600 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                )}
              >
                <Icon size={15} className="flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="bg-brand-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                    12
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 pb-3 border-t border-gray-100 pt-3 space-y-2">
          {/* Model selector */}
          <div className="relative group">
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className={clsx('w-2 h-2 rounded-full', currentModel === 'anthropic' ? 'bg-amber-500' : currentModel === 'openai' ? 'bg-green-500' : currentModel === 'groq' ? 'bg-purple-500' : 'bg-blue-500')} />
              <span className="text-[12px] text-gray-600 flex-1 text-left capitalize">{currentModel}</span>
              <ChevronDown size={12} className="text-gray-400" />
            </button>
            {/* Dropdown */}
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg hidden group-hover:block z-50">
              {models.map(m => (
                <button
                  key={m}
                  onClick={() => setModelOverride(m)}
                  className={clsx('w-full text-left px-3 py-2 text-[12px] hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg capitalize flex items-center gap-2', m === currentModel && 'text-brand-600 font-medium')}
                >
                  <div className={clsx('w-1.5 h-1.5 rounded-full', m==='anthropic'?'bg-amber-500':m==='openai'?'bg-green-500':m==='groq'?'bg-purple-500':'bg-blue-500')} />
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* User */}
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-[11px] font-semibold text-brand-600 flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-gray-800 truncate">{user?.name || 'User'}</div>
              <div className="text-[10px] text-gray-400 capitalize">{user?.role || 'standard'}</div>
            </div>
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Logout"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
