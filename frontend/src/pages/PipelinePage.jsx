import { useState, useEffect } from 'react'
import { MapPin, Loader } from 'lucide-react'
import { candidatesApi, pipelineApi } from '../utils/api'
import clsx from 'clsx'

const COLUMNS = [
  { id:'sourced',     label:'Sourced',     dot:'bg-gray-400',    bg:'bg-gray-50'    },
  { id:'shortlisted', label:'Shortlisted', dot:'bg-brand-500',   bg:'bg-brand-50/40'},
  { id:'in_review',   label:'In Review',   dot:'bg-amber-500',   bg:'bg-amber-50/40'},
  { id:'contacted',   label:'Contacted',   dot:'bg-purple-500',  bg:'bg-purple-50/40'},
  { id:'rejected',    label:'Rejected',    dot:'bg-red-400',     bg:'bg-red-50/40'  },
]

export default function PipelinePage() {
  const [cards, setCards]     = useState([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  useEffect(() => {
    candidatesApi.list(null, {})
      .then(res => setCards(res.data))
      .catch(() => setCards([]))
      .finally(() => setLoading(false))
  }, [])

  async function moveCard(card, newStage) {
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, stage: newStage } : c))
    try { await candidatesApi.updateStage(card.id, newStage) } catch {}
  }

  function onDragStart(e, card) { setDragging(card); e.dataTransfer.effectAllowed = 'move' }
  function onDrop(e, colId) {
    e.preventDefault()
    if (dragging && dragging.stage !== colId) moveCard(dragging, colId)
    setDragging(null); setDragOver(null)
  }

  const byCols = COLUMNS.reduce((acc,col) => {
    acc[col.id] = cards.filter(c => c.stage === col.id)
    return acc
  }, {})

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-gray-400 gap-2">
      <Loader size={16} className="animate-spin" /> Loading pipeline…
    </div>
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 flex-shrink-0">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Candidate Pipeline</h1>
          <p className="text-xs text-gray-400 mt-0.5">{cards.length} candidates across all stages · Drag to move</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {COLUMNS.map(col => (
            <div key={col.id} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
              <div className={clsx('w-1.5 h-1.5 rounded-full', col.dot)} />
              {byCols[col.id]?.length || 0}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-3 h-full min-w-max">
          {COLUMNS.map(col => (
            <div key={col.id}
              onDragOver={e => { e.preventDefault(); setDragOver(col.id) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => onDrop(e, col.id)}
              className={clsx('w-[240px] flex-shrink-0 flex flex-col rounded-xl transition',
                dragOver===col.id ? 'bg-brand-50 ring-2 ring-brand-300' : col.bg)}>
              {/* Column header */}
              <div className="px-3 py-3 flex items-center gap-2 flex-shrink-0">
                <div className={clsx('w-2 h-2 rounded-full', col.dot)} />
                <span className="text-[12px] font-semibold text-gray-700">{col.label}</span>
                <span className="text-[11px] text-gray-400 ml-auto bg-white rounded-full px-2 py-0.5 border border-gray-200">
                  {byCols[col.id]?.length || 0}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                {(byCols[col.id] || []).map(card => {
                  const scoreColor = card.score>=75?'text-brand-600':card.score>=60?'text-amber-600':'text-red-500'
                  return (
                    <div key={card.id} draggable
                      onDragStart={e => onDragStart(e, card)}
                      className={clsx('bg-white rounded-xl border border-gray-100 p-3 cursor-grab active:cursor-grabbing select-none transition',
                        dragging?.id===card.id ? 'opacity-40 scale-95' : 'hover:border-gray-300 hover:shadow-sm')}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full text-[11px] font-semibold flex items-center justify-center flex-shrink-0"
                          style={{ background: card.bg || '#E6F1FB', color: card.color || '#185FA5' }}>
                          {(card.name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold text-gray-900 truncate">{card.name}</div>
                          <div className="text-[10px] text-gray-400 truncate">{card.company}</div>
                        </div>
                        <div className={clsx('text-[12px] font-bold flex-shrink-0', scoreColor)}>{Math.round(card.score)}</div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {(card.skills||[]).slice(0,3).map(s => (
                          <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{s}</span>
                        ))}
                      </div>
                      {card.location && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                          <MapPin size={9}/> {card.location}
                        </div>
                      )}
                    </div>
                  )
                })}
                {(byCols[col.id]||[]).length===0 && (
                  <div className={clsx('rounded-xl border-2 border-dashed flex items-center justify-center py-8',
                    dragOver===col.id ? 'border-brand-300 bg-brand-50/50' : 'border-gray-200')}>
                    <span className="text-[11px] text-gray-300">Drop here</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
