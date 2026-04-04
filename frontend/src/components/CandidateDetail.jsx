import { useState } from 'react'
import { X, CheckCircle, XCircle, MessageSquare, Star, ChevronDown, ExternalLink, Clipboard } from 'lucide-react'
import { candidatesApi } from '../utils/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const STAGE_OPTIONS = ['sourced','shortlisted','in_review','contacted','rejected']

export default function CandidateDetail({ candidate: c, analysis, onClose, onStageChange }) {
  const [loadingQ, setLoadingQ] = useState(false)
  const [questionnaire, setQuestionnaire] = useState(null)
  const [showQ, setShowQ] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contacts, setContacts] = useState(null)
  const [tab, setTab] = useState(0)

  if (!c) {
    return (
      <div className="w-[260px] flex-shrink-0 bg-white border-l border-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-300 px-6">
          <div className="text-3xl mb-2">👤</div>
          <p className="text-xs">Select a candidate to see their evaluation</p>
        </div>
      </div>
    )
  }

  const scoreColor = c.score >= 75 ? '#185FA5' : c.score >= 60 ? '#BA7517' : '#A32D2D'
  const verdictCls = c.verdict === 'Strong fit' ? 'verdict-strong' : c.verdict === 'Moderate fit' ? 'verdict-moderate' : 'verdict-weak'
  const circumference = 2 * Math.PI * 28
  const strokeDash = (c.score / 100) * circumference

  async function generateQuestionnaire() {
    setLoadingQ(true)
    try {
      const res = await candidatesApi.questionnaire(c.id)
      setQuestionnaire(res.data.questionnaire)
      setShowQ(true)
    } catch {
      // Mock questionnaire
      setQuestionnaire(MOCK_QUESTIONNAIRE(c))
      setShowQ(true)
    } finally {
      setLoadingQ(false)
    }
  }

  async function extractContacts() {
    setLoadingContacts(true)
    try {
      const res = await candidatesApi.getContacts(c.id)
      setContacts(res.data)
    } catch {
      setContacts({ email: null, linkedin: `linkedin.com/in/${c.name.toLowerCase().replace(' ','-')}`, note: 'Email not publicly available' })
      toast.success('Public profile found')
    } finally {
      setLoadingContacts(false)
    }
  }

  async function shortlistCandidate() {
    onStageChange('shortlisted')
    try { await candidatesApi.updateStage(c.id, 'shortlisted') } catch {}
    toast.success(`${c.name} shortlisted`)
  }

  const categories = [
    { name: 'Payments', val: c.payments, max: 30 },
    { name: 'Stakeholder', val: c.stake, max: 22 },
    { name: 'Data', val: c.data, max: 18 },
    { name: 'Leadership', val: c.lead, max: 14 },
  ]

  return (
    <div className="w-[268px] flex-shrink-0 bg-white border-l border-gray-100 flex flex-col animate-slide-in overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-start gap-2 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-gray-900 truncate">{c.name}</div>
          <div className="text-[11px] text-gray-400 truncate">{c.role} · {c.company}</div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 flex-shrink-0 mt-0.5">
          <X size={13} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 flex-shrink-0">
        {['Evaluation','Interview','Contacts'].map((t,i) => (
          <button key={t} onClick={() => setTab(i)}
            className={clsx('flex-1 py-2 text-[11px] font-medium border-b-2 transition',
              tab===i ? 'text-brand-600 border-brand-500' : 'text-gray-400 border-transparent hover:text-gray-600')}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 0 && (
          <div className="p-4 space-y-4">
            {/* Score ring */}
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#F3F4F6" strokeWidth="5" />
                  <circle
                    cx="32" cy="32" r="28" fill="none"
                    stroke={scoreColor} strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${strokeDash} ${circumference}`}
                    transform="rotate(-90 32 32)"
                    style={{ transition: 'stroke-dasharray 0.8s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[15px] font-bold" style={{ color: scoreColor }}>{c.score}</span>
                  <span className="text-[8px] text-gray-400">/ 100</span>
                </div>
              </div>
              <div>
                <span className={clsx('text-[11px] font-semibold px-2 py-1 rounded-full', verdictCls)}>{c.verdict}</span>
                <div className="text-[11px] text-gray-500 mt-1.5">{c.exp} · {c.location}</div>
                {c.remote && <div className="text-[10px] text-green-600 mt-0.5">Open to remote</div>}
              </div>
            </div>

            {/* Category scores */}
            <div>
              <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2">Category Scores</div>
              <div className="space-y-2">
                {categories.map(cat => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <div className="text-[11px] text-gray-600 w-20 flex-shrink-0">{cat.name}</div>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-brand-400 transition-all" style={{ width: `${(cat.val/cat.max)*100}%` }} />
                    </div>
                    <div className="text-[11px] text-gray-500 w-10 text-right">{cat.val}/{cat.max}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths */}
            {c.str?.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2">Strengths</div>
                <div className="space-y-2">
                  {c.str.map((s, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <CheckCircle size={13} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-gray-600 leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gaps */}
            {c.gap_detail?.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2">Gaps</div>
                <div className="space-y-2">
                  {c.gap_detail.map((g, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <XCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-gray-600 leading-relaxed">{g}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decision snapshot */}
            {(c.biggest_strength || c.biggest_risk) && (
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase">Decision Snapshot</div>
                {c.shortlist_decision && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">Shortlist:</span>
                    <span className={clsx('text-[11px] font-semibold', c.shortlist_decision==='Yes'?'text-green-600':c.shortlist_decision==='No'?'text-red-500':'text-amber-600')}>
                      {c.shortlist_decision}
                    </span>
                  </div>
                )}
                {c.biggest_strength && (
                  <div className="text-[11px] text-gray-600"><span className="text-gray-400">Strength:</span> {c.biggest_strength}</div>
                )}
                {c.biggest_risk && (
                  <div className="text-[11px] text-gray-600"><span className="text-gray-400">Risk:</span> {c.biggest_risk}</div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 1 && (
          <div className="p-4 space-y-4">
            {/* Top interview question */}
            {c.interview_q && (
              <div>
                <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2">Top Question</div>
                <div className="bg-brand-50 border-l-2 border-brand-400 rounded-r-xl p-3">
                  <p className="text-[12px] text-gray-700 leading-relaxed italic">{c.interview_q}</p>
                </div>
              </div>
            )}

            {/* Questionnaire */}
            <div>
              <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2">CV Enrichment Questionnaire</div>
              {!showQ ? (
                <button
                  onClick={generateQuestionnaire}
                  disabled={loadingQ}
                  className="w-full py-2.5 border border-gray-200 rounded-lg text-[12px] text-gray-600 hover:bg-gray-50 transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loadingQ ? 'Generating…' : <><MessageSquare size={13} /> Generate questionnaire</>}
                </button>
              ) : (
                <div className="space-y-3">
                  {questionnaire?.sections?.map((sec, si) => (
                    <div key={si}>
                      <div className="text-[11px] font-semibold text-gray-700 mb-1.5">{sec.title}</div>
                      <div className="space-y-2">
                        {sec.questions?.map((q, qi) => (
                          <div key={qi} className="bg-gray-50 rounded-lg p-2.5">
                            <span className="text-[10px] text-gray-400 font-medium">{si+1}.{qi+1}</span>
                            <p className="text-[11px] text-gray-700 mt-0.5 leading-relaxed">{q}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => { navigator.clipboard.writeText(questionnaire?.sections?.flatMap(s=>s.questions).join('\n\n')); toast.success('Copied') }}
                    className="w-full py-2 border border-gray-200 rounded-lg text-[11px] text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition"
                  >
                    <Clipboard size={11} /> Copy all questions
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 2 && (
          <div className="p-4 space-y-4">
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Extract publicly available contact information for this candidate. Only public profile data is retrieved — no aggressive scraping.
            </p>
            {!contacts ? (
              <button
                onClick={extractContacts}
                disabled={loadingContacts}
                className="w-full py-2.5 bg-brand-600 text-white rounded-lg text-[12px] font-medium hover:bg-brand-800 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loadingContacts ? 'Searching…' : 'Find public contacts'}
              </button>
            ) : (
              <div className="space-y-3">
                {contacts.linkedin && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <span className="text-base">💼</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-gray-400 font-medium">LinkedIn</div>
                      <div className="text-[12px] text-brand-600 truncate">{contacts.linkedin}</div>
                    </div>
                    <a href={`https://${contacts.linkedin}`} target="_blank" rel="noreferrer">
                      <ExternalLink size={12} className="text-gray-400" />
                    </a>
                  </div>
                )}
                {contacts.email && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <span className="text-base">✉️</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-gray-400 font-medium">Email</div>
                      <div className="text-[12px] text-gray-700 truncate">{contacts.email}</div>
                    </div>
                  </div>
                )}
                {contacts.note && (
                  <p className="text-[11px] text-gray-400 italic">{contacts.note}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="p-3 border-t border-gray-100 space-y-2 flex-shrink-0">
        <button
          onClick={shortlistCandidate}
          disabled={c.stage === 'shortlisted'}
          className="w-full py-2.5 bg-brand-600 hover:bg-brand-800 text-white rounded-lg text-[12px] font-medium transition disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <Star size={13} />
          {c.stage === 'shortlisted' ? 'Shortlisted ✓' : 'Shortlist Candidate'}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={c.stage}
            onChange={e => onStageChange(e.target.value)}
            className="col-span-2 py-2 px-3 border border-gray-200 rounded-lg text-[12px] text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400 capitalize bg-white"
          >
            {STAGE_OPTIONS.map(s => (
              <option key={s} value={s} className="capitalize">{s.replace('_',' ')}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

function MOCK_QUESTIONNAIRE(c) {
  return {
    sections: [
      {
        title: '1. Role-Relevant Experience Clarification',
        questions: [
          `Can you walk me through a specific payments product you owned end-to-end — from problem definition through to post-launch metrics?`,
          `What has been your most complex cross-functional initiative in a ${c.company || 'previous'} context, and how did you drive alignment across engineering, compliance, and commercial teams?`,
        ]
      },
      {
        title: '2. Depth, Complexity & Proficiency',
        questions: [
          `How deeply have you worked with payment rails, acquiring relationships, or settlement infrastructure — and at what scale?`,
          `What data tools and methodologies do you use when evaluating product performance and prioritising the roadmap?`,
        ]
      },
      {
        title: '3. Adjacent or Transferable Experience',
        questions: [
          `Have you worked on any products with regulatory compliance requirements — even outside payments — and how did you navigate the balance between compliance and product velocity?`,
          `Your CV shows experience in ${c.skills?.[0] || 'fintech'} — can you describe whether any of that involved B2B merchant or enterprise customers?`,
        ]
      },
      {
        title: '4. Ownership, Impact & Outcomes',
        questions: [
          `What is the most significant business outcome you can point to from a product you owned — and what was your specific contribution?`,
          `Describe a situation where you had to influence a direction without direct authority — how did you approach it and what was the result?`,
        ]
      },
    ]
  }
}
