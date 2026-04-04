import { useState } from 'react'
import {
  X, CheckCircle, XCircle, MessageSquare, Star,
  ExternalLink, Clipboard, Send, Linkedin, Copy,
  Check, Loader, AlertCircle
} from 'lucide-react'
import { candidatesApi } from '../utils/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const STAGE_OPTIONS = ['sourced','shortlisted','in_review','contacted','rejected']
const TABS = ['Evaluation', 'Interview', 'Outreach', 'Contacts']

export default function CandidateDetail({ candidate: c, analysis, onClose, onStageChange }) {
  const [loadingQ, setLoadingQ]         = useState(false)
  const [questionnaire, setQuestionnaire] = useState(null)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contacts, setContacts]         = useState(null)
  const [loadingOutreach, setLoadingOutreach] = useState(false)
  const [outreach, setOutreach]         = useState(null)
  const [copiedIdx, setCopiedIdx]       = useState(null)
  const [tab, setTab]                   = useState(0)

  if (!c) {
    return (
      <div className="w-[268px] flex-shrink-0 bg-white border-l border-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-300 px-6">
          <div className="text-3xl mb-2">👤</div>
          <p className="text-xs leading-relaxed">Select a candidate<br/>to see their evaluation</p>
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
    } catch {
      setQuestionnaire(MOCK_QUESTIONNAIRE(c))
    } finally { setLoadingQ(false) }
  }

  async function generateOutreach() {
    setLoadingOutreach(true)
    try {
      const res = await candidatesApi.outreach(c.id)
      setOutreach(res.data)
    } catch {
      const first = c.name?.split(' ')[0] || 'there'
      setOutreach({
        messages: [
          { tone: 'Professional', text: `Hi ${first}, I came across your profile and think your background at ${c.company} is a strong fit for a role I'm hiring for. Would love to connect.` },
          { tone: 'Warm & direct', text: `Hi ${first} — your experience at ${c.company} caught my eye. I'm recruiting for a position that aligns well with your background. Open to a quick chat?` },
          { tone: 'Role-specific', text: `Hi ${first}, recruiting for a role and your profile stood out immediately. The experience you've built is exactly what we need. Interested in learning more?` },
        ],
        linkedin_search_url: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(c.name || '')}`,
        subject_line: `Opportunity — ${c.role || 'exciting role'}`
      })
    } finally { setLoadingOutreach(false) }
  }

  async function extractContacts() {
    setLoadingContacts(true)
    try {
      const res = await candidatesApi.getContacts(c.id)
      setContacts(res.data)
    } catch {
      setContacts({
        email: null,
        linkedin: c.profile_url?.includes('linkedin') ? c.profile_url : `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(c.name || '')}`,
        note: 'Email not publicly available. LinkedIn link opens a search.'
      })
    } finally { setLoadingContacts(false) }
  }

  async function shortlistCandidate() {
    onStageChange('shortlisted')
    try { await candidatesApi.updateStage(c.id, 'shortlisted') } catch {}
    toast.success(`${c.name} shortlisted`)
  }

  function copyText(text, idx) {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const categories = [
    { name: 'Payments',    val: c.payments || 0, max: 30 },
    { name: 'Stakeholder', val: c.stake    || 0, max: 22 },
    { name: 'Data',        val: c.data     || 0, max: 18 },
    { name: 'Leadership',  val: c.lead     || 0, max: 14 },
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
      <div className="flex border-b border-gray-100 flex-shrink-0 overflow-x-auto">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={clsx(
              'flex-shrink-0 px-3 py-2.5 text-[11px] font-medium border-b-2 transition whitespace-nowrap',
              tab === i ? 'text-brand-600 border-brand-500' : 'text-gray-400 border-transparent hover:text-gray-600'
            )}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── Tab 0: Evaluation ── */}
        {tab === 0 && (
          <div className="p-4 space-y-4">
            {/* Score ring */}
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#F3F4F6" strokeWidth="5" />
                  <circle cx="32" cy="32" r="28" fill="none"
                    stroke={scoreColor} strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${strokeDash} ${circumference}`}
                    transform="rotate(-90 32 32)"
                    style={{ transition: 'stroke-dasharray 0.8s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[15px] font-bold" style={{ color: scoreColor }}>{Math.round(c.score)}</span>
                  <span className="text-[8px] text-gray-400">/ 100</span>
                </div>
              </div>
              <div>
                <span className={clsx('text-[11px] font-semibold px-2 py-1 rounded-full', verdictCls)}>{c.verdict}</span>
                <div className="text-[11px] text-gray-500 mt-1.5">{c.exp} · {c.location}</div>
                {c.remote && <div className="text-[10px] text-green-600 mt-0.5">Open to remote</div>}
              </div>
            </div>

            {/* Category bars */}
            <div>
              <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2">Category Scores</div>
              <div className="space-y-2">
                {categories.map(cat => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <div className="text-[11px] text-gray-600 w-20 flex-shrink-0">{cat.name}</div>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-brand-400 transition-all"
                        style={{ width: cat.max > 0 ? `${(cat.val / cat.max) * 100}%` : '0%' }} />
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
                <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase">Snapshot</div>
                {c.shortlist_decision && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">Shortlist:</span>
                    <span className={clsx('text-[11px] font-semibold',
                      c.shortlist_decision === 'Yes' ? 'text-green-600' :
                      c.shortlist_decision === 'No' ? 'text-red-500' : 'text-amber-600')}>
                      {c.shortlist_decision}
                    </span>
                  </div>
                )}
                {c.biggest_strength && <div className="text-[11px] text-gray-600"><span className="text-gray-400">Strength: </span>{c.biggest_strength}</div>}
                {c.biggest_risk     && <div className="text-[11px] text-gray-600"><span className="text-gray-400">Risk: </span>{c.biggest_risk}</div>}
              </div>
            )}
          </div>
        )}

        {/* ── Tab 1: Interview ── */}
        {tab === 1 && (
          <div className="p-4 space-y-4">
            {c.interview_q && (
              <div>
                <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2">Top Question</div>
                <div className="bg-brand-50 border-l-2 border-brand-400 rounded-r-xl p-3">
                  <p className="text-[12px] text-gray-700 leading-relaxed italic">{c.interview_q}</p>
                </div>
              </div>
            )}

            <div>
              <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2">CV Enrichment Questionnaire</div>
              {!questionnaire ? (
                <button onClick={generateQuestionnaire} disabled={loadingQ}
                  className="w-full py-2.5 border border-gray-200 rounded-lg text-[12px] text-gray-600 hover:bg-gray-50 transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {loadingQ ? <><Loader size={13} className="animate-spin" /> Generating…</> : <><MessageSquare size={13} /> Generate questionnaire</>}
                </button>
              ) : (
                <div className="space-y-3">
                  {questionnaire?.sections?.map((sec, si) => (
                    <div key={si}>
                      <div className="text-[11px] font-semibold text-gray-700 mb-1.5">{sec.title}</div>
                      <div className="space-y-2">
                        {sec.questions?.map((q, qi) => (
                          <div key={qi} className="bg-gray-50 rounded-lg p-2.5">
                            <span className="text-[10px] text-gray-400 font-medium">{si+1}.{qi+1} </span>
                            <span className="text-[11px] text-gray-700 leading-relaxed">{q}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => copyText(questionnaire?.sections?.flatMap(s => s.questions).join('\n\n'), 'q')}
                    className="w-full py-2 border border-gray-200 rounded-lg text-[11px] text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition">
                    {copiedIdx === 'q' ? <><Check size={11} className="text-green-500" /> Copied</> : <><Clipboard size={11} /> Copy all questions</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab 2: Outreach ── */}
        {tab === 2 && (
          <div className="p-4 space-y-4">
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Generate personalised LinkedIn outreach messages for this candidate — tailored to their background and the role.
            </p>

            {!outreach ? (
              <button onClick={generateOutreach} disabled={loadingOutreach}
                className="w-full py-3 bg-brand-600 text-white rounded-xl text-[12px] font-semibold hover:bg-brand-800 transition disabled:opacity-60 flex items-center justify-center gap-2">
                {loadingOutreach
                  ? <><Loader size={13} className="animate-spin" /> Generating messages…</>
                  : <><Send size={13} /> Generate outreach messages</>
                }
              </button>
            ) : (
              <div className="space-y-3">
                {/* LinkedIn direct link */}
                <a
                  href={outreach.linkedin_search_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2.5 bg-[#0077B5] text-white rounded-xl text-[12px] font-medium hover:bg-[#005885] transition"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  Search {c.name} on LinkedIn
                  <ExternalLink size={11} className="ml-auto opacity-70" />
                </a>

                {/* Message variants */}
                <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-1">Message Variants</div>
                {outreach.messages?.map((msg, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-3 group hover:border-gray-300 transition">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{msg.tone}</span>
                      <span className={clsx('text-[10px]', msg.text.length > 280 ? 'text-red-500' : 'text-gray-400')}>
                        {msg.text.length}/300
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-700 leading-relaxed mb-2">{msg.text}</p>
                    <button
                      onClick={() => copyText(msg.text, i)}
                      className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-700 transition">
                      {copiedIdx === i
                        ? <><Check size={11} className="text-green-500" /><span className="text-green-600">Copied!</span></>
                        : <><Copy size={11} /> Copy message</>
                      }
                    </button>
                  </div>
                ))}

                {/* Email subject */}
                {outreach.subject_line && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Email subject line</div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-gray-700">{outreach.subject_line}</span>
                      <button onClick={() => copyText(outreach.subject_line, 'subj')} className="text-gray-400 hover:text-gray-600 transition">
                        {copiedIdx === 'subj' ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                      </button>
                    </div>
                  </div>
                )}

                <button onClick={() => setOutreach(null)}
                  className="w-full py-2 border border-gray-200 rounded-lg text-[11px] text-gray-500 hover:bg-gray-50 transition">
                  Regenerate messages
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 3: Contacts ── */}
        {tab === 3 && (
          <div className="p-4 space-y-4">
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Find publicly available contact information for this candidate.
            </p>
            {!contacts ? (
              <button onClick={extractContacts} disabled={loadingContacts}
                className="w-full py-2.5 bg-brand-600 text-white rounded-lg text-[12px] font-medium hover:bg-brand-800 transition disabled:opacity-60 flex items-center justify-center gap-2">
                {loadingContacts ? <><Loader size={13} className="animate-spin" /> Searching…</> : 'Find public contacts'}
              </button>
            ) : (
              <div className="space-y-3">
                {contacts.linkedin && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#0077B5"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-gray-400 font-medium">LinkedIn</div>
                      <div className="text-[12px] text-brand-600 truncate">{contacts.linkedin}</div>
                    </div>
                    <a href={contacts.linkedin.startsWith('http') ? contacts.linkedin : `https://${contacts.linkedin}`}
                      target="_blank" rel="noreferrer">
                      <ExternalLink size={12} className="text-gray-400 hover:text-brand-600" />
                    </a>
                  </div>
                )}
                {contacts.email && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <MessageSquare size={14} className="text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-gray-400 font-medium">Email</div>
                      <div className="text-[12px] text-gray-700 truncate">{contacts.email}</div>
                    </div>
                    <button onClick={() => copyText(contacts.email, 'email')}>
                      {copiedIdx === 'email' ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-gray-400 hover:text-gray-600" />}
                    </button>
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
        <button onClick={shortlistCandidate} disabled={c.stage === 'shortlisted'}
          className="w-full py-2.5 bg-brand-600 hover:bg-brand-800 text-white rounded-lg text-[12px] font-medium transition disabled:opacity-40 flex items-center justify-center gap-2">
          <Star size={13} />
          {c.stage === 'shortlisted' ? 'Shortlisted ✓' : 'Shortlist Candidate'}
        </button>
        <select value={c.stage} onChange={e => onStageChange(e.target.value)}
          className="w-full py-2 px-3 border border-gray-200 rounded-lg text-[12px] text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400 capitalize bg-white">
          {STAGE_OPTIONS.map(s => (
            <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function MOCK_QUESTIONNAIRE(c) {
  return {
    sections: [
      { title: '1. Role-Relevant Experience', questions: [`Can you walk me through a specific initiative you owned end-to-end at ${c.company || 'your last role'} — from problem definition to post-launch?`, `What has been your most complex cross-functional initiative and how did you drive alignment?`] },
      { title: '2. Depth & Proficiency',      questions: [`At what scale and complexity have you operated in your current role?`, `What methodologies and tools do you rely on most heavily for prioritisation and measurement?`] },
      { title: '3. Adjacent Experience',       questions: [`Are there aspects of your experience not on your CV that are relevant here?`, `Have you worked in adjacent domains that would transfer to this role?`] },
      { title: '4. Seniority & Influence',     questions: [`Describe a time you influenced a direction without direct authority.`, `How do you typically handle situations where stakeholders disagree with your recommendation?`] },
      { title: '5. Ownership & Impact',        questions: [`What is the most significant business outcome you can point to from your work?`, `How do you measure success and hold yourself accountable to outcomes?`] },
    ]
  }
}
