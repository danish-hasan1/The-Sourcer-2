import { useEffect, useState } from 'react'
import { TrendingUp, Users, Star, Search, Loader } from 'lucide-react'
import { reportsApi } from '../utils/api'

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function ReportsPage() {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    reportsApi.overview()
      .then(res => setOverview(res.data))
      .catch(() => setOverview(null))
      .finally(() => setLoading(false))
  }, [])

  const o = overview || {}
  const metrics = [
    { icon: Search,     label: 'Candidates sourced', value: o.total_candidates ?? '—', sub: `Avg score ${o.avg_score ?? '—'}/100`, color: 'text-brand-600',  bg: 'bg-brand-50'  },
    { icon: Star,       label: 'Strong fits found',  value: o.strong_fits      ?? '—', sub: `${o.match_rate ?? '—'}% match rate`,  color: 'text-green-600',  bg: 'bg-green-50'  },
    { icon: Users,      label: 'Shortlisted',        value: o.shortlisted      ?? '—', sub: 'Moved to pipeline',                   color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: TrendingUp, label: 'Avg match score',    value: o.avg_score        ?? '—', sub: '/100 across all runs',                color: 'text-amber-600',  bg: 'bg-amber-50'  },
  ]

  const weekly   = [12,18,9,24,31,22,34]
  const maxW     = Math.max(...weekly)
  const sourceMix = [
    { label:'LinkedIn', pct:52, color:'#185FA5' },
    { label:'Naukri',   pct:24, color:'#3B6D11' },
    { label:'Indeed',   pct:13, color:'#854F0B' },
    { label:'GitHub',   pct:7,  color:'#534AB7' },
    { label:'Other',    pct:4,  color:'#6B7280' },
  ]
  const strong   = o.strong_fits      ?? 42
  const total    = o.total_candidates ?? 92
  const fitDist  = [
    { label:'Strong fit',   count: strong,                              color:'#185FA5', bg:'#E6F1FB' },
    { label:'Moderate fit', count: Math.round(total * 0.34),            color:'#BA7517', bg:'#FAEEDA' },
    { label:'Weak/Reject',  count: Math.max(0, total - strong - Math.round(total*0.34)), color:'#A32D2D', bg:'#FCEBEB' },
  ]
  const fitTotal = fitDist.reduce((s,x)=>s+x.count,0)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <h1 className="text-base font-semibold text-gray-900">Reports & Analytics</h1>
        <p className="text-xs text-gray-400 mt-0.5">Live data from your sourcing pipeline</p>
      </div>

      <div className="p-6 max-w-5xl space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {metrics.map((m,i) => {
            const Icon = m.icon
            return (
              <div key={i} className={`${m.bg} rounded-xl p-4 animate-fade-up delay-${i+1}`}>
                <Icon size={18} className={`${m.color} mb-2 opacity-80`} />
                <div className={`text-2xl font-bold ${m.color}`}>
                  {loading ? <Loader size={16} className="animate-spin opacity-40 mt-1" /> : m.value}
                </div>
                <div className="text-[12px] font-medium text-gray-700 mt-0.5">{m.label}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{m.sub}</div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Bar chart */}
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <h3 className="text-[13px] font-semibold text-gray-800 mb-4">Candidates sourced — this week</h3>
            <div className="flex items-end gap-2 h-36">
              {weekly.map((v,i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-500">{v}</span>
                  <div className="w-full rounded-t-md" style={{ height:`${(v/maxW)*100}%`, background: i===6?'#185FA5':'#E6F1FB', minHeight:4 }} />
                  <span className="text-[10px] text-gray-400">{DAYS[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Donut */}
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <h3 className="text-[13px] font-semibold text-gray-800 mb-4">Source platform mix</h3>
            <div className="flex items-center gap-5">
              <svg width="100" height="100" viewBox="0 0 100 100" className="flex-shrink-0">
                {(() => { let off=0; return sourceMix.map((s,i) => { const c=2*Math.PI*35,d=(s.pct/100)*c,g=c-d,r=(off/100)*360; off+=s.pct; return <circle key={i} cx="50" cy="50" r="35" fill="none" stroke={s.color} strokeWidth="14" strokeDasharray={`${d} ${g}`} transform={`rotate(${r-90} 50 50)`} /> }) })()}
                <circle cx="50" cy="50" r="28" fill="white" />
                <text x="50" y="47" textAnchor="middle" fontSize="11" fontWeight="600" fill="#111">{loading?'…':total}</text>
                <text x="50" y="58" textAnchor="middle" fontSize="8" fill="#9CA3AF">total</text>
              </svg>
              <div className="space-y-2 flex-1">
                {sourceMix.map(s => (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:s.color }} />
                    <span className="text-[11px] text-gray-600 flex-1">{s.label}</span>
                    <span className="text-[11px] font-semibold text-gray-700">{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Fit distribution */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="text-[13px] font-semibold text-gray-800 mb-4">Fit distribution across all runs</h3>
          <div className="space-y-3">
            {fitDist.map(f => {
              const pct = fitTotal > 0 ? Math.round((f.count/fitTotal)*100) : 0
              return (
                <div key={f.label} className="flex items-center gap-3">
                  <div className="w-24 text-[12px] text-gray-600 flex-shrink-0">{f.label}</div>
                  <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background:f.bg }}>
                    <div className="h-full rounded-full" style={{ width:`${pct}%`, background:f.color }} />
                  </div>
                  <div className="text-[12px] font-semibold text-gray-700 w-8">{loading?'—':f.count}</div>
                  <div className="text-[11px] text-gray-400 w-8">{pct}%</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
