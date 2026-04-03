import { useState, useEffect } from 'react'
import { FileText, Search, Plus, Trash2, Copy, ChevronRight, Loader } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { jobsApi } from '../utils/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function SavedJDsPage() {
  const [search, setSearch]   = useState('')
  const [jds, setJds]         = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    jobsApi.list()
      .then(res => setJds(res.data))
      .catch(() => setJds([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id) {
    try {
      await jobsApi.delete(id)
      setJds(prev => prev.filter(j => j.id !== id))
      toast.success('JD deleted')
    } catch { toast.error('Failed to delete') }
  }

  async function handleDuplicate(jd) {
    try {
      const res = await jobsApi.create({ title: `${jd.title} (copy)`, jd_text: jd.jd_text })
      setJds(prev => [res.data, ...prev])
      toast.success('JD duplicated')
    } catch { toast.error('Failed to duplicate') }
  }

  const filtered = jds.filter(j =>
    j.title?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Saved Job Descriptions</h1>
          <p className="text-xs text-gray-400 mt-0.5">{jds.length} JD{jds.length !== 1 ? 's' : ''} saved · Reuse for quick sourcing</p>
        </div>
        <div className="flex-1" />
        <button onClick={() => navigate('/source')}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-[13px] font-medium rounded-lg hover:bg-brand-800 transition">
          <Plus size={14} /> New JD
        </button>
      </div>

      <div className="p-6 max-w-3xl">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 mb-5">
          <Search size={14} className="text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search saved JDs…"
            className="flex-1 text-sm outline-none placeholder:text-gray-400" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
            <Loader size={16} className="animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            {jds.length === 0
              ? <><p className="text-sm">No saved JDs yet</p>
                  <button onClick={() => navigate('/source')} className="mt-2 text-sm text-brand-600 hover:underline">Upload your first JD →</button></>
              : <p className="text-sm">No JDs match your search</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((jd, i) => (
              <div key={jd.id}
                className={`bg-white border border-gray-100 rounded-xl px-4 py-4 flex items-center gap-4 hover:border-gray-300 transition animate-fade-up delay-${Math.min(i+1,5)}`}>
                <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText size={16} className="text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-gray-900">{jd.title}</div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium capitalize',
                      jd.status === 'analysed' || jd.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {jd.status}
                    </span>
                    {jd.analysis?.primary_competencies?.slice(0,3).map(c => (
                      <span key={c.name} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{c.name}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleDuplicate(jd)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition" title="Duplicate">
                    <Copy size={13} />
                  </button>
                  <button onClick={() => handleDelete(jd.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition" title="Delete">
                    <Trash2 size={13} />
                  </button>
                  <button onClick={() => navigate(`/source/${jd.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-[12px] rounded-lg hover:bg-brand-800 transition ml-1">
                    Use <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
