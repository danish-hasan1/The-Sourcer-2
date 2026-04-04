import { useState, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload, ChevronRight, Sparkles, RefreshCw,
  Filter, Save, Check, BookmarkPlus, ChevronDown,
  Search, SlidersHorizontal, X, Info
} from 'lucide-react'
import { sourcingApi, jobsApi } from '../utils/api'
import { useAppStore } from '../store/appStore'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import JDAnalysisPanel from '../components/JDAnalysisPanel'
import CandidateList from '../components/CandidateList'
import CandidateDetail from '../components/CandidateDetail'
import SourcingModal from '../components/SourcingModal'
import SkeletonCards from '../components/SkeletonCards'

const STEPS = ['Upload JD', 'Analyse', 'Source', 'Review']

const FIT_FILTERS = ['Strong fit', 'Moderate fit', 'Weak fit']

export default function SourcePage() {
  const [step, setStep]                   = useState(0)
  const [jdText, setJdText]               = useState('')
  const [jobTitle, setJobTitle]           = useState('')
  const [jobId, setJobId]                 = useState(null)
  const [jdAnalysis, setJdAnalysis]       = useState(null)
  const [analysing, setAnalysing]         = useState(false)
  const [saving, setSaving]               = useState(false)
  const [saved, setSaved]                 = useState(false)
  const [showSourcingModal, setShowSourcingModal] = useState(false)
  const [showTweakModal, setShowTweakModal]       = useState(false)
  const [candidates, setCandidates]       = useState([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [activeStage, setActiveStage]     = useState('all')
  const [filterFit, setFilterFit]         = useState(null)
  const [showFitDropdown, setShowFitDropdown] = useState(false)
  const [lastSearchParams, setLastSearchParams] = useState(null) // { platforms, maxResults, boolean }
  const { selectedCandidate, setSelectedCandidate } = useAppStore()
  const pollRef = useRef(null)

  // Drop zone
  const onDrop = useCallback(async (files) => {
    const file = files[0]
    if (!file) return
    if (file.type === 'text/plain') {
      const text = await file.text()
      setJdText(text)
      if (step === 0) setStep(1)
    } else {
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await jobsApi.create(fd)
        setJdText(res.data.text || '')
        setJobTitle(res.data.title || '')
        if (step === 0) setStep(1)
        toast.success('File parsed successfully')
      } catch {
        toast.error('Failed to parse file — try pasting the JD manually')
      }
    }
  }, [step])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
  })

  // ── Analyse JD ──────────────────────────────────────────────────────────────
  async function handleAnalyse() {
    if (!jdText.trim()) { toast.error('Please enter or upload a job description'); return }
    setAnalysing(true)
    try {
      let jId = jobId
      if (!jId) {
        const res = await jobsApi.create({ title: jobTitle || 'Untitled Role', jd_text: jdText })
        jId = res.data.id
        setJobId(jId)
      } else {
        // Update existing job with latest text
        await jobsApi.update(jId, { title: jobTitle || 'Untitled Role', jd_text: jdText })
      }
      const res2 = await jobsApi.analyze(jId)
      setJdAnalysis(res2.data)
      // Auto-set title from analysis if we didn't have one
      if (!jobTitle && res2.data?.suggested_titles?.[0]) {
        setJobTitle(res2.data.suggested_titles[0])
      }
      setStep(2)
      setSaved(false)
      toast.success('JD analysed successfully')
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Analysis failed'
      if (err.response?.status === 400) {
        toast.error('No JD text — please paste or upload a job description')
      } else if (err.response?.status === 401) {
        toast.error('Session expired — please log in again')
      } else {
        toast.error(`Analysis failed: ${msg}`)
      }
    } finally {
      setAnalysing(false)
    }
  }

  // ── Save JD ────────────────────────────────────────────────────────────────
  async function handleSaveJD() {
    if (!jobId) {
      toast.error('Analyse the JD first before saving')
      return
    }
    setSaving(true)
    try {
      await jobsApi.update(jobId, { title: jobTitle || 'Untitled Role', jd_text: jdText })
      setSaved(true)
      toast.success(`"${jobTitle || 'JD'}" saved to your library`)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      toast.error('Failed to save JD')
    } finally {
      setSaving(false)
    }
  }

  // ── Sourcing complete ───────────────────────────────────────────────────────
  async function handleSourcingComplete(runId, searchParams) {
    setShowSourcingModal(false)
    setLastSearchParams(searchParams)
    setStep(3)
    setLoadingCandidates(true)
    let attempts = 0
    pollRef.current = setInterval(async () => {
      attempts++
      try {
        const res = await sourcingApi.status(runId)
        if (res.data.candidates?.length) {
          setCandidates(prev => {
            const ids = new Set(prev.map(c => c.id))
            const newOnes = res.data.candidates.filter(c => !ids.has(c.id))
            return newOnes.length ? [...prev, ...newOnes] : prev
          })
        }
        if (res.data.status === 'complete') {
          clearInterval(pollRef.current)
          const cRes = await sourcingApi.results(jobId)
          if (cRes.data.candidates?.length) setCandidates(cRes.data.candidates)
          setLoadingCandidates(false)
          toast.success(`Sourcing complete — ${cRes.data.candidates?.length || 0} candidates found`)
        }
        if (res.data.status === 'failed') {
          clearInterval(pollRef.current)
          setLoadingCandidates(false)
          toast.error('Sourcing failed — check your SerpAPI key in Settings')
        }
        if (attempts >= 90) {
          clearInterval(pollRef.current)
          setLoadingCandidates(false)
          toast.error('Sourcing timed out — try fewer platforms')
        }
      } catch {
        if (attempts >= 5) {
          clearInterval(pollRef.current)
          setLoadingCandidates(false)
          toast.error('Connection lost — please try again')
        }
      }
    }, 2000)
  }

  useEffect(() => () => clearInterval(pollRef.current), [])

  const stageCounts = {
    all:         candidates.length,
    sourced:     candidates.filter(c => c.stage === 'sourced').length,
    shortlisted: candidates.filter(c => c.stage === 'shortlisted').length,
    in_review:   candidates.filter(c => c.stage === 'in_review').length,
    contacted:   candidates.filter(c => c.stage === 'contacted').length,
  }

  const filteredCandidates = candidates.filter(c => {
    if (activeStage !== 'all' && c.stage !== activeStage) return false
    if (filterFit && c.verdict !== filterFit) return false
    return true
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Topbar ── */}
      <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-3 flex-shrink-0">
        {/* Breadcrumb steps */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <button
                onClick={() => i <= step && setStep(i)}
                className={clsx('text-[12px] px-2 py-1 rounded transition',
                  i === step   ? 'text-brand-600 font-medium bg-brand-50' :
                  i < step     ? 'text-gray-500 hover:text-gray-700 cursor-pointer' :
                  'text-gray-300 cursor-default')}>
                {s}
              </button>
              {i < STEPS.length - 1 && <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />}
            </div>
          ))}
        </div>

        {step >= 2 && jobTitle && (
          <div className="text-[12px] text-gray-400 truncate max-w-[200px]">{jobTitle}</div>
        )}

        <div className="flex-1" />

        {/* Save JD button — appears once analysed */}
        {step >= 2 && (
          <button
            onClick={handleSaveJD}
            disabled={saving || saved}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border transition',
              saved
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            )}>
            {saved
              ? <><Check size={13} /> Saved</>
              : saving
              ? <><RefreshCw size={13} className="animate-spin" /> Saving…</>
              : <><BookmarkPlus size={13} /> Save JD</>
            }
          </button>
        )}

        {/* Tweak Search — appears after sourcing */}
        {step === 3 && candidates.length > 0 && (
          <button
            onClick={() => setShowTweakModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
            <SlidersHorizontal size={13} />
            Tweak search
          </button>
        )}

        {/* Source / Re-source */}
        {step >= 2 && (
          <button
            onClick={() => setShowSourcingModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-[13px] font-medium rounded-lg hover:bg-brand-800 transition">
            <Sparkles size={14} />
            {step === 2 ? 'Source Profiles' : 'Re-source'}
          </button>
        )}

        {/* Analyse button — step 0/1 */}
        {jdText && step < 2 && (
          <button onClick={handleAnalyse} disabled={analysing}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-[13px] font-medium rounded-lg hover:bg-brand-800 transition disabled:opacity-60">
            {analysing
              ? <><RefreshCw size={14} className="animate-spin" /> Analysing…</>
              : <><Sparkles size={14} /> Analyse JD</>
            }
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Step 0/1: JD input ── */}
        {step < 2 && (
          <div className="flex-1 flex items-start justify-center p-8 overflow-y-auto">
            <div className="w-full max-w-2xl animate-fade-up">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Upload or paste a Job Description</h2>
              <p className="text-sm text-gray-500 mb-6">The AI extracts competencies, builds a scoring matrix, and generates search parameters specific to this role.</p>

              <div className="mb-4">
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Job Title (optional)</label>
                <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition" />
              </div>

              <div {...getRootProps()}
                className={clsx('border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition mb-4',
                  isDragActive ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50')}>
                <input {...getInputProps()} />
                <Upload size={24} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {isDragActive ? 'Drop your file here…' : 'Drop a .pdf, .docx, or .txt, or click to browse'}
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF, Word, plain text</p>
              </div>

              <div className="text-center text-xs text-gray-400 mb-4">— or paste the JD below —</div>

              <textarea value={jdText} onChange={e => { setJdText(e.target.value); if (step === 0) setStep(1) }}
                placeholder="Paste the full job description here…"
                rows={14}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition resize-none font-mono leading-relaxed" />

              {jdText && (
                <button onClick={handleAnalyse} disabled={analysing}
                  className="w-full mt-4 py-3 bg-brand-600 hover:bg-brand-800 text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-60">
                  {analysing
                    ? <><RefreshCw size={15} className="animate-spin" /> Analysing JD…</>
                    : <><Sparkles size={15} /> Analyse with AI</>
                  }
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2/3: Analysis + Candidates ── */}
        {step >= 2 && (
          <>
            <JDAnalysisPanel analysis={jdAnalysis} jdText={jdText} onReanalyse={handleAnalyse} />

            {/* Candidates column */}
            <div className="flex-1 flex flex-col min-w-0 border-x border-gray-100">

              {/* Search filters info bar — shows after sourcing */}
              {step === 3 && lastSearchParams && (
                <div className="px-4 py-2 bg-brand-50 border-b border-brand-100 flex items-center gap-2 flex-shrink-0">
                  <Info size={12} className="text-brand-500 flex-shrink-0" />
                  <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                    <span className="text-[11px] text-brand-700 font-medium">Search used:</span>
                    {lastSearchParams.platforms?.map(p => (
                      <span key={p} className="text-[10px] px-2 py-0.5 bg-white border border-brand-200 rounded-full text-brand-600 capitalize">{p}</span>
                    ))}
                    <span className="text-[10px] text-brand-600">· max {lastSearchParams.maxResults}</span>
                    {lastSearchParams.boolean && (
                      <span className="text-[10px] text-brand-500 truncate max-w-[200px] font-mono" title={lastSearchParams.boolean}>
                        {lastSearchParams.boolean.substring(0, 60)}{lastSearchParams.boolean.length > 60 ? '…' : ''}
                      </span>
                    )}
                  </div>
                  <button onClick={() => setShowTweakModal(true)}
                    className="text-[11px] text-brand-600 hover:text-brand-800 font-medium flex-shrink-0 flex items-center gap-1">
                    <SlidersHorizontal size={11} /> Tweak
                  </button>
                </div>
              )}

              {/* Stage strip */}
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-white border-b border-gray-100 overflow-x-auto flex-shrink-0">
                {[['all','All'],['sourced','Sourced'],['shortlisted','Shortlisted'],['in_review','In Review'],['contacted','Contacted']].map(([v, l]) => (
                  <button key={v} onClick={() => setActiveStage(v)}
                    className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] whitespace-nowrap transition flex-shrink-0',
                      activeStage === v ? 'bg-brand-50 text-brand-600 font-medium' : 'text-gray-500 hover:bg-gray-50')}>
                    {l}
                    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full',
                      activeStage === v ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-500')}>
                      {stageCounts[v] || 0}
                    </span>
                  </button>
                ))}
                <div className="flex-1" />

                {/* Fit filter dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowFitDropdown(s => !s)}
                    className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] border transition',
                      filterFit ? 'bg-brand-50 border-brand-200 text-brand-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
                    <Filter size={11} />
                    {filterFit || 'All fits'}
                    <ChevronDown size={10} />
                  </button>
                  {showFitDropdown && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[140px]">
                      <button onClick={() => { setFilterFit(null); setShowFitDropdown(false) }}
                        className={clsx('w-full text-left px-3 py-2 text-[12px] hover:bg-gray-50 rounded-t-xl', !filterFit && 'text-brand-600 font-medium')}>
                        All fits
                      </button>
                      {FIT_FILTERS.map(f => (
                        <button key={f} onClick={() => { setFilterFit(f); setShowFitDropdown(false) }}
                          className={clsx('w-full text-left px-3 py-2 text-[12px] hover:bg-gray-50 last:rounded-b-xl', filterFit === f && 'text-brand-600 font-medium')}>
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Candidate list or skeleton */}
              {loadingCandidates && candidates.length === 0
                ? <SkeletonCards />
                : <CandidateList
                    candidates={filteredCandidates}
                    selected={selectedCandidate}
                    onSelect={setSelectedCandidate}
                    onStageChange={(id, stage) => setCandidates(prev => prev.map(c => c.id === id ? { ...c, stage } : c))}
                  />
              }
            </div>

            {/* Detail panel */}
            <CandidateDetail
              candidate={selectedCandidate}
              analysis={jdAnalysis}
              onClose={() => setSelectedCandidate(null)}
              onStageChange={stage => {
                if (!selectedCandidate) return
                setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? { ...c, stage } : c))
                setSelectedCandidate({ ...selectedCandidate, stage })
              }}
            />
          </>
        )}
      </div>

      {/* ── Sourcing Modal ── */}
      {showSourcingModal && (
        <SourcingModal
          jobId={jobId}
          analysis={jdAnalysis}
          initialParams={lastSearchParams}
          onClose={() => setShowSourcingModal(false)}
          onComplete={handleSourcingComplete}
        />
      )}

      {/* ── Tweak Search Modal ── */}
      {showTweakModal && (
        <TweakSearchModal
          analysis={jdAnalysis}
          lastParams={lastSearchParams}
          onClose={() => setShowTweakModal(false)}
          onApply={(params) => {
            setShowTweakModal(false)
            setShowSourcingModal(true)
          }}
        />
      )}
    </div>
  )
}

// ─── Tweak Search Modal ──────────────────────────────────────────────────────
function TweakSearchModal({ analysis, lastParams, onClose, onApply }) {
  const [booleanOverride, setBooleanOverride] = useState(lastParams?.boolean || analysis?.boolean_strings?.primary || '')
  const [notes, setNotes]                     = useState('')
  const [generating, setGenerating]           = useState(false)
  const [suggestions, setSuggestions]         = useState(null)

  const booleanOptions = analysis?.boolean_strings ? [
    { label: 'Primary (balanced)', value: analysis.boolean_strings.primary },
    { label: 'Broad (discovery)',  value: analysis.boolean_strings.broad   },
    { label: 'Narrow (precision)', value: analysis.boolean_strings.narrow  },
  ] : []

  async function generateRefinedSearch() {
    if (!notes.trim()) { toast.error('Describe what you want to improve'); return }
    setGenerating(true)
    try {
      // Call LLM to refine the boolean string
      const res = await fetch('/api/sourcing/refine-boolean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('talentai-auth') ? JSON.parse(localStorage.getItem('talentai-auth'))?.state?.token : ''}` },
        body: JSON.stringify({ current_boolean: booleanOverride, feedback: notes, analysis })
      })
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.suggestions)
      } else {
        throw new Error('Failed')
      }
    } catch {
      // Local suggestions based on notes
      setSuggestions([
        { label: 'Broader search',   value: analysis?.boolean_strings?.broad   || booleanOverride },
        { label: 'Narrower search',  value: analysis?.boolean_strings?.narrow  || booleanOverride },
        { label: 'Current (unchanged)', value: booleanOverride },
      ])
    } finally { setGenerating(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-up overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
            <SlidersHorizontal size={16} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-900">Tweak Search</div>
            <div className="text-xs text-gray-400 mt-0.5">Refine your search query to improve results</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={15} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Current query */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              Current Boolean Query
            </label>
            <textarea
              value={booleanOverride}
              onChange={e => setBooleanOverride(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[12px] font-mono focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none leading-relaxed"
            />
          </div>

          {/* Quick presets */}
          {booleanOptions.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Switch to preset
              </label>
              <div className="space-y-1.5">
                {booleanOptions.map(opt => (
                  <button key={opt.label}
                    onClick={() => setBooleanOverride(opt.value)}
                    className={clsx('w-full text-left px-3 py-2.5 rounded-xl border text-[12px] transition',
                      booleanOverride === opt.value
                        ? 'border-brand-300 bg-brand-50 text-brand-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600')}>
                    <div className="font-medium mb-0.5">{opt.label}</div>
                    <div className="font-mono text-[10px] text-gray-400 truncate">{opt.value}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Feedback for AI refinement */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              What's wrong with the current results?
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Too many junior candidates, missing Python devs, too much US focus…"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
            <button onClick={generateRefinedSearch} disabled={generating || !notes.trim()}
              className="mt-2 flex items-center gap-1.5 text-[12px] text-brand-600 hover:text-brand-800 font-medium disabled:opacity-40 transition">
              {generating ? <><RefreshCw size={12} className="animate-spin" /> Generating refinements…</> : <><Sparkles size={12} /> Generate AI refinements</>}
            </button>
          </div>

          {/* AI suggestions */}
          {suggestions && (
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">AI Suggestions</label>
              <div className="space-y-1.5">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => setBooleanOverride(s.value)}
                    className={clsx('w-full text-left px-3 py-2.5 rounded-xl border text-[12px] transition',
                      booleanOverride === s.value ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-gray-300 text-gray-600')}>
                    <div className="font-medium mb-0.5">{s.label}</div>
                    <div className="font-mono text-[10px] text-gray-400 truncate">{s.value}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            onClick={() => onApply({ boolean: booleanOverride })}
            className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-[13px] font-semibold hover:bg-brand-800 transition flex items-center justify-center gap-2">
            <Search size={14} /> Re-run with this query
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Mock data (kept for demo/fallback reference only) ────────────────────────
export const MOCK_ANALYSIS = {
  role_objective: 'Own end-to-end product strategy for payments infrastructure across EU markets.',
  seniority: 'Senior / Lead',
  ownership: 'End-to-end product ownership with P&L visibility',
  primary_competencies: [
    { name: 'Payments domain expertise', weight: 30, why: 'Core to role.' },
    { name: 'Stakeholder management', weight: 22, why: 'Role requires influencing engineering, compliance, sales, and executive leadership.' },
    { name: 'Data-driven product development', weight: 18, why: '"Drive" and "own" language implies measurement-led decisions.' },
    { name: 'Leadership & cross-functional influence', weight: 14, why: 'Implicit from senior/lead seniority.' },
  ],
  secondary_competencies: [
    { name: 'Agile / Scrum delivery', weight: 10 },
    { name: 'API / technical literacy', weight: 6 },
  ],
  implicit_expectations: 'Regulatory awareness (PSD2, PCI-DSS), EU market familiarity, B2B SaaS background.',
  evaluation_biases: 'Hiring manager will prioritize demonstrated payments ownership.',
  non_negotiables: ['Payments domain experience', 'Stakeholder influence at senior level'],
  boolean_strings: {
    primary: '("Product Manager" OR "Product Lead") ("payments" OR "fintech") ("Stripe" OR "Adyen" OR "Razorpay")',
    broad:   '("PM" OR "Product Manager") payments ("EU" OR "Europe" OR "PSD2")',
    narrow:  '"Senior Product Manager" payments ("Stripe" OR "Adyen") "PSD2"',
  }
}

export const MOCK_CANDIDATES = [
  { id:1, name:'Riya Kapoor',  initials:'RK', color:'#185FA5', bg:'#E6F1FB', role:'Senior PM', company:'Razorpay', exp:'7 yrs', location:'Mumbai, IN', remote:true,  score:84, verdict:'Strong fit',   stage:'sourced',     source:'linkedin', skills:['Payments','FinTech','B2B SaaS'], gaps:['EU markets'], payments:26,stake:18,data:15,lead:12, str:['7 yrs payments domain, owned 0→1 card product','Strong data — SQL, Mixpanel, A/B testing across 40M users'], gap_detail:['No explicit EU market or PSD2 regulatory experience'], interview_q:"Walk me through a cross-functional payments initiative you drove end-to-end.", shortlist_decision:'Yes', biggest_strength:'Deep payments domain + data', biggest_risk:'EU regulatory gap' },
  { id:2, name:'Marco Silva',  initials:'MS', color:'#3B6D11', bg:'#EAF3DE', role:'Product Lead',company:'Stripe',  exp:'9 yrs', location:'Lisbon, PT',  remote:true,  score:79, verdict:'Strong fit',   stage:'sourced',     source:'linkedin', skills:['Payments','EU markets','PSD2'],  gaps:['B2B depth'],    payments:24,stake:17,data:14,lead:11, str:['9 yrs at Stripe, deep EU payments and PSD2','Led developer-facing API product line'], gap_detail:['Less B2B SaaS vertical depth'], interview_q:"How have you balanced regulatory compliance with shipping speed?", shortlist_decision:'Yes', biggest_strength:'EU + PSD2 native', biggest_risk:'B2B SaaS weaker' },
  { id:3, name:'Alex Turner',  initials:'AT', color:'#534AB7', bg:'#EEEDFE', role:'Senior PM',  company:'Monzo',   exp:'6 yrs', location:'London, UK',  remote:true,  score:76, verdict:'Strong fit',   stage:'shortlisted', source:'linkedin', skills:['FinTech','EU markets','PSD2'],   gaps:['B2B ownership'], payments:22,stake:16,data:14,lead:12, str:['EU market fluency — built Monzo international features','Strong user research and data approach'], gap_detail:['Primarily B2C — limited B2B ownership'], interview_q:"How would you approach B2B product given your B2C background?", shortlist_decision:'Yes', biggest_strength:'EU-native PM', biggest_risk:'B2C→B2B' },
]
