import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Search, GitBranch, FileText, TrendingUp, Plus, ArrowRight, Clock } from 'lucide-react'
import { reportsApi, jobsApi } from '../utils/api'

const FALLBACK_STATS = [
  { label: 'Active Jobs',        value: 0,  sub: '',               color: 'text-brand-600',  bg: 'bg-brand-50' },
  { label: 'Candidates Sourced', value: 0,  sub: '',               color: 'text-green-600',  bg: 'bg-green-50' },
  { label: 'Shortlisted',        value: 0,  sub: 'Across all jobs',color: 'text-amber-600',  bg: 'bg-amber-50' },
  { label: 'In Review',          value: 0,  sub: 'Awaiting action',color: 'text-purple-600', bg: 'bg-purple-50' },
]

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState(FALLBACK_STATS)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  useEffect(() => {
    async function load() {
      try {
        const [overviewRes, jobsRes] = await Promise.all([
          reportsApi.overview(),
          jobsApi.list(),
        ])
        const o = overviewRes.data
        setStats([
          { label: 'Active Jobs',        value: jobsRes.data.length,    sub: '',                  color: 'text-brand-600',  bg: 'bg-brand-50' },
          { label: 'Candidates Sourced', value: o.total_candidates || 0,sub: `Avg score ${o.avg_score}`, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Shortlisted',        value: o.shortlisted || 0,     sub: `${o.match_rate}% match rate`, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Strong Fits',        value: o.strong_fits || 0,     sub: 'Across all jobs',   color: 'text-purple-600', bg: 'bg-purple-50' },
        ])
        setJobs(jobsRes.data.slice(0, 4))
      } catch {
        // Backend not running — show placeholder tiles
        setStats([
          { label: 'Active Jobs',        value: '—', sub: 'Connect backend', color: 'text-brand-600',  bg: 'bg-brand-50' },
          { label: 'Candidates Sourced', value: '—', sub: '',                color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Shortlisted',        value: '—', sub: '',                color: 'text-amber-600',  bg: 'bg-amber-50' },
          { label: 'Strong Fits',        value: '—', sub: '',                color: 'text-purple-600', bg: 'bg-purple-50' },
        ])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <h1 className="text-base font-semibold text-gray-900">
          {greeting}, {user?.name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Here's what's happening across your sourcing pipeline.</p>
      </div>

      <div className="p-6 max-w-5xl">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <div key={i} className={`${s.bg} rounded-xl p-4 animate-fade-up delay-${i+1}`}>
              <div className={`text-2xl font-semibold ${s.color}`}>{loading ? '…' : s.value}</div>
              <div className="text-sm font-medium text-gray-700 mt-1">{s.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: Plus,       label: 'New sourcing run',  sub: 'Upload JD and source candidates', action: () => navigate('/app/source'),    color: 'bg-brand-600 text-white hover:bg-brand-800' },
            { icon: GitBranch,  label: 'View pipeline',     sub: 'Manage your candidate pipeline',  action: () => navigate('/app/pipeline'),  color: 'bg-gray-900 text-white hover:bg-gray-700' },
            { icon: FileText,   label: 'Saved JDs',         sub: 'Reuse previous job descriptions', action: () => navigate('/app/saved-jds'), color: 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200' },
          ].map((a, i) => {
            const Icon = a.icon
            return (
              <button key={i} onClick={a.action}
                className={`${a.color} rounded-xl p-5 text-left transition group`}>
                <Icon size={20} className="mb-3 opacity-80" />
                <div className="font-medium text-sm">{a.label}</div>
                <div className="text-xs opacity-70 mt-0.5">{a.sub}</div>
              </button>
            )
          })}
        </div>

        {/* Recent jobs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Recent Sourcing Runs</h2>
            <button onClick={() => navigate('/app/source')} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {jobs.length > 0 ? jobs.map((job, i) => (
              <div key={job.id}
                onClick={() => navigate(`/app/source/${job.id}`)}
                className={`bg-white rounded-xl border border-gray-100 px-4 py-3.5 flex items-center gap-4 cursor-pointer hover:border-gray-300 transition animate-fade-up delay-${i+1}`}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{job.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5 capitalize">{job.status}</div>
                </div>
                <ArrowRight size={14} className="text-gray-300" />
              </div>
            )) : !loading && (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center">
                <p className="text-sm text-gray-400">No sourcing runs yet</p>
                <button onClick={() => navigate('/app/source')} className="mt-2 text-sm text-brand-600 hover:underline">Start your first run →</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
