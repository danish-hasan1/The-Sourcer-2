import { useState, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, ChevronRight, X, Sparkles, RefreshCw, Filter, ChevronDown } from 'lucide-react'
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

export default function SourcePage() {
  const [step, setStep] = useState(0)
  const [jdText, setJdText] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [jobId, setJobId] = useState(null)
  const [jdAnalysis, setJdAnalysis] = useState(null)
  const [analysing, setAnalysing] = useState(false)
  const [showSourcingModal, setShowSourcingModal] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [activeStage, setActiveStage] = useState('all')
  const [filterFit, setFilterFit] = useState(null)
  const { selectedCandidate, setSelectedCandidate } = useAppStore()
  const pollRef = useRef(null)

  // Drop zone
  const onDrop = useCallback(async (files) => {
    const file = files[0]
    if (!file) return
    if (file.type === 'text/plain') {
      const text = await file.text()
      setJdText(text)
    } else {
      // PDF/DOCX — send to backend for extraction
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await jobsApi.create(fd)
        setJdText(res.data.text)
        setJobTitle(res.data.title || '')
        toast.success('File parsed successfully')
      } catch {
        toast.error('Failed to parse file. Paste the JD manually.')
      }
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/plain': ['.txt'], 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    maxFiles: 1,
  })

  async function handleAnalyse() {
    if (!jdText.trim()) { toast.error('Please enter or upload a job description'); return }
    setAnalysing(true)
    try {
      // Create job, then analyse
      let jId = jobId
      if (!jId) {
        const res = await jobsApi.create({ title: jobTitle || 'Untitled Role', jd_text: jdText })
        jId = res.data.id
        setJobId(jId)
      }
      const res2 = await jobsApi.analyze(jId)
      setJdAnalysis(res2.data)
      setStep(2)
      toast.success('JD analysed successfully')
    } catch (err) {
      // Demo mode — mock analysis
      setJdAnalysis(MOCK_ANALYSIS)
      setStep(2)
      toast.success('JD analysed (demo mode)')
    } finally {
      setAnalysing(false)
    }
  }

  async function handleSourcingComplete(runId) {
    setShowSourcingModal(false)
    setStep(3)
    setLoadingCandidates(true)
    // Poll for results
    let attempts = 0
    pollRef.current = setInterval(async () => {
      attempts++
      try {
        const res = await sourcingApi.status(runId)
        if (res.data.status === 'complete') {
          clearInterval(pollRef.current)
          const cRes = await sourcingApi.results(jobId || 1)
          setCandidates(cRes.data.candidates || MOCK_CANDIDATES)
          setLoadingCandidates(false)
        }
        if (res.data.candidates?.length) {
          setCandidates(prev => {
            const ids = new Set(prev.map(c => c.id))
            const newOnes = res.data.candidates.filter(c => !ids.has(c.id))
            return [...prev, ...newOnes]
          })
        }
      } catch {
        // Demo
        if (attempts >= 3) {
          clearInterval(pollRef.current)
          setCandidates(MOCK_CANDIDATES)
          setLoadingCandidates(false)
        }
      }
    }, 2000)
  }

  useEffect(() => () => clearInterval(pollRef.current), [])

  const filteredCandidates = candidates.filter(c => {
    if (activeStage !== 'all' && c.stage !== activeStage) return false
    if (filterFit && c.verdict !== filterFit) return false
    return true
  })

  const stageCounts = { all: candidates.length, sourced: candidates.filter(c=>c.stage==='sourced').length, shortlisted: candidates.filter(c=>c.stage==='shortlisted').length, in_review: candidates.filter(c=>c.stage==='in_review').length, contacted: candidates.filter(c=>c.stage==='contacted').length }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-4 flex-shrink-0">
        {/* Breadcrumb steps */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <button
                onClick={() => i < step && setStep(i)}
                className={clsx('text-[12px] px-2 py-1 rounded transition', i === step ? 'text-brand-600 font-medium' : i < step ? 'text-gray-500 hover:text-gray-700 cursor-pointer' : 'text-gray-300 cursor-default')}
              >
                {s}
              </button>
              {i < STEPS.length - 1 && <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />}
            </div>
          ))}
        </div>

        <div className="flex-1" />

        {step >= 2 && (
          <button
            onClick={() => setShowSourcingModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-[13px] font-medium rounded-lg hover:bg-brand-800 transition"
          >
            <Sparkles size={14} />
            {step === 2 ? 'Source Profiles' : 'Re-source'}
          </button>
        )}
        {jdText && step < 2 && (
          <button
            onClick={handleAnalyse}
            disabled={analysing}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-[13px] font-medium rounded-lg hover:bg-brand-800 transition disabled:opacity-60"
          >
            {analysing ? <><RefreshCw size={14} className="animate-spin" /> Analysing…</> : <><Sparkles size={14} /> Analyse JD</>}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Step 0+1: JD Input */}
        {step < 2 && (
          <div className="flex-1 flex items-start justify-center p-8 overflow-y-auto">
            <div className="w-full max-w-2xl animate-fade-up">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Upload or paste a Job Description</h2>
              <p className="text-sm text-gray-500 mb-6">The AI will extract competencies, build a scoring matrix, and generate search parameters.</p>

              {/* Job title */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Job Title (optional)</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Product Manager"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
                />
              </div>

              {/* Drop zone */}
              <div
                {...getRootProps()}
                className={clsx(
                  'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition mb-4',
                  isDragActive ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                )}
              >
                <input {...getInputProps()} />
                <Upload size={24} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {isDragActive ? 'Drop your file here…' : 'Drop a .pdf, .docx, or .txt file here, or click to browse'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Supports PDF, Word, and plain text</p>
              </div>

              <div className="text-center text-xs text-gray-400 mb-4">— or paste the JD below —</div>

              <textarea
                value={jdText}
                onChange={e => { setJdText(e.target.value); if (step === 0) setStep(1) }}
                placeholder="Paste the full job description here…"
                rows={14}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition resize-none font-mono leading-relaxed"
              />

              {jdText && (
                <button
                  onClick={handleAnalyse}
                  disabled={analysing}
                  className="w-full mt-4 py-3 bg-brand-600 hover:bg-brand-800 text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {analysing ? <><RefreshCw size={15} className="animate-spin" /> Analysing JD…</> : <><Sparkles size={15} /> Analyse with AI</>}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 2+3: Analysis + Candidates */}
        {step >= 2 && (
          <>
            {/* JD Analysis panel */}
            <JDAnalysisPanel analysis={jdAnalysis} jdText={jdText} onReanalyse={handleAnalyse} />

            {/* Candidates */}
            <div className="flex-1 flex flex-col min-w-0 border-x border-gray-100">
              {/* Stage strip */}
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-white border-b border-gray-100 overflow-x-auto flex-shrink-0">
                {[['all','All'],['sourced','Sourced'],['shortlisted','Shortlisted'],['in_review','In Review'],['contacted','Contacted']].map(([v,l]) => (
                  <button key={v} onClick={() => setActiveStage(v)}
                    className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] whitespace-nowrap transition flex-shrink-0',
                      activeStage === v ? 'bg-brand-50 text-brand-600 font-medium' : 'text-gray-500 hover:bg-gray-50')}>
                    {l}
                    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full', activeStage===v ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-500')}>
                      {stageCounts[v] || 0}
                    </span>
                  </button>
                ))}
                <div className="flex-1" />
                {/* Fit filter */}
                <div className="relative">
                  <button className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] border transition', filterFit ? 'bg-brand-50 border-brand-200 text-brand-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50')}
                    onClick={() => setFilterFit(null)}>
                    <Filter size={11} />
                    {filterFit || 'All fits'}
                  </button>
                </div>
              </div>

              {/* List or skeleton */}
              {loadingCandidates && candidates.length === 0 ? (
                <SkeletonCards />
              ) : (
                <CandidateList
                  candidates={filteredCandidates}
                  selected={selectedCandidate}
                  onSelect={setSelectedCandidate}
                  onStageChange={(id, stage) => setCandidates(prev => prev.map(c => c.id===id ? {...c,stage} : c))}
                />
              )}
            </div>

            {/* Detail panel */}
            <CandidateDetail
              candidate={selectedCandidate}
              analysis={jdAnalysis}
              onClose={() => setSelectedCandidate(null)}
              onStageChange={(stage) => {
                if (!selectedCandidate) return
                setCandidates(prev => prev.map(c => c.id===selectedCandidate.id ? {...c,stage} : c))
                setSelectedCandidate({...selectedCandidate, stage})
              }}
            />
          </>
        )}
      </div>

      {/* Sourcing Modal */}
      {showSourcingModal && (
        <SourcingModal
          jobId={jobId}
          analysis={jdAnalysis}
          onClose={() => setShowSourcingModal(false)}
          onComplete={handleSourcingComplete}
        />
      )}
    </div>
  )
}

// ─── Mock data for demo ───────────────────────────────────────────────────────
export const MOCK_ANALYSIS = {
  role_objective: 'Own end-to-end product strategy for payments infrastructure across EU markets. Drive 0→1 and growth-stage initiatives with cross-functional teams.',
  seniority: 'Senior / Lead',
  ownership: 'End-to-end product ownership with P&L visibility',
  primary_competencies: [
    { name: 'Payments domain expertise', weight: 30, why: 'Core to role — without deep payments knowledge the candidate cannot own the product roadmap credibly.' },
    { name: 'Stakeholder management', weight: 22, why: 'Role requires influencing engineering, compliance, sales, and executive leadership.' },
    { name: 'Data-driven product development', weight: 18, why: '"Drive" and "own" language implies measurement-led decisions, A/B testing, funnel analysis.' },
    { name: 'Leadership & cross-functional influence', weight: 14, why: 'Implicit from senior/lead seniority — expected to mentor and influence without direct authority.' },
  ],
  secondary_competencies: [
    { name: 'Agile / Scrum delivery', weight: 10 },
    { name: 'API / technical literacy', weight: 6 },
  ],
  implicit_expectations: 'Regulatory awareness (PSD2, PCI-DSS), EU market familiarity, B2B SaaS background, comfort with ambiguity and 0→1 phases.',
  evaluation_biases: 'Hiring manager will prioritize demonstrated payments ownership over adjacent fintech experience. EU regulatory exposure is implicit must-have.',
  non_negotiables: ['Payments domain experience', 'Stakeholder influence at senior level'],
  boolean_strings: {
    primary: '(site:linkedin.com/in) ("Product Manager" OR "Product Lead") ("payments" OR "fintech" OR "payment gateway") ("Stripe" OR "Adyen" OR "Razorpay" OR "PayU")',
    broad: '("PM" OR "Product Manager") payments ("EU" OR "Europe" OR "PSD2")',
    narrow: '"Senior Product Manager" payments ("Stripe" OR "Adyen" OR "Braintree") "PSD2"',
  }
}

export const MOCK_CANDIDATES = [
  { id:1, name:'Riya Kapoor',   initials:'RK', color:'#185FA5', bg:'#E6F1FB', role:'Senior PM', company:'Razorpay',  exp:'7 yrs', location:'Mumbai, IN',   remote:true,  score:84, verdict:'Strong fit',   stage:'sourced', source:'linkedin', skills:['Payments','FinTech','B2B SaaS','Data-driven','Agile'], gaps:['EU markets','PSD2'], payments:26,stake:18,data:15,lead:12, str:['7 yrs payments domain, owned 0→1 card product at Razorpay','Strong data background — SQL, Mixpanel, A/B testing across 40M users'], gap_detail:['No explicit EU market or PSD2 regulatory experience'], interview_q:"Walk me through a time you drove a cross-functional payments initiative from problem definition to launch — what was your role in influencing without authority?", shortlist_decision:'Yes', biggest_strength:'Deep payments domain + data maturity', biggest_risk:'EU regulatory gap — trainable' },
  { id:2, name:'Marco Silva',   initials:'MS', color:'#3B6D11', bg:'#EAF3DE', role:'Product Lead',company:'Stripe',    exp:'9 yrs', location:'Lisbon, PT',   remote:true,  score:79, verdict:'Strong fit',   stage:'sourced', source:'linkedin', skills:['Payments','EU markets','API products','PSD2','B2B'], gaps:['B2B vertical depth'], payments:24,stake:17,data:14,lead:11, str:['9 yrs at Stripe, deep EU payments and PSD2 compliance knowledge','Led developer-facing API product line — strong technical acumen'], gap_detail:['Less B2B SaaS vertical depth; mostly platform infrastructure'], interview_q:"How have you balanced regulatory compliance requirements with shipping speed in a payments context?", shortlist_decision:'Yes', biggest_strength:'EU + PSD2 native', biggest_risk:'B2B SaaS angle weaker' },
  { id:3, name:'Priya Lal',     initials:'PL', color:'#854F0B', bg:'#FAEEDA', role:'PM II',      company:'Paytm',     exp:'5 yrs', location:'Delhi, IN',     remote:false, score:67, verdict:'Moderate fit', stage:'sourced', source:'naukri',   skills:['Payments','Data-driven','A/B Testing','UPI'], gaps:['Stakeholder mgmt','EU regulation','Senior seniority'], payments:20,stake:12,data:16,lead:9, str:['Strong data and experimentation culture from Paytm scale','Payments core — UPI flows, merchant onboarding owned end-to-end'], gap_detail:['Limited senior stakeholder influence; primarily execution-level','No EU or PSD2 exposure'], interview_q:"Describe a situation where you had to gain buy-in from leadership for a product decision you strongly believed in.", shortlist_decision:'Borderline', biggest_strength:'Data maturity', biggest_risk:'Seniority mismatch' },
  { id:4, name:'Alex Turner',   initials:'AT', color:'#534AB7', bg:'#EEEDFE', role:'Senior PM',  company:'Monzo',     exp:'6 yrs', location:'London, UK',   remote:true,  score:76, verdict:'Strong fit',   stage:'shortlisted', source:'linkedin', skills:['FinTech','EU markets','PSD2','User research','B2C'], gaps:['B2B product ownership'], payments:22,stake:16,data:14,lead:12, str:['EU market fluency — built Monzo international account features','Strong user research and data-driven approach in FinTech'], gap_detail:['Primarily B2C; limited B2B product ownership — key gap for this role'], interview_q:"How would you approach building a B2B product given your consumer-focused background?", shortlist_decision:'Yes', biggest_strength:'EU-native payments PM', biggest_risk:'B2C → B2B transition' },
  { id:5, name:'Neha Joshi',    initials:'NJ', color:'#993556', bg:'#FBEAF0', role:'Group PM',   company:'PhonePe',   exp:'8 yrs', location:'Bangalore, IN',remote:false, score:58, verdict:'Moderate fit', stage:'sourced', source:'naukri',   skills:['Payments','Consumer fintech','Scale','India market'], gaps:['EU markets','API literacy','PSD2','Stakeholder mgmt senior'], payments:18,stake:14,data:11,lead:8, str:['Strong payments fundamentals, managed large-scale consumer volumes','Good internal stakeholder management at India org level'], gap_detail:['EU market, regulatory exposure, and API literacy all weak','Stakeholder influence primarily domestic'], interview_q:"What has been your most complex cross-border product challenge and how did you navigate the regulatory constraints?", shortlist_decision:'No', biggest_strength:'Scale & execution', biggest_risk:'Multiple critical gaps' },
  { id:6, name:'Liam Chen',     initials:'LC', color:'#3B6D11', bg:'#E1F5EE', role:'Director PM',company:'Adyen',     exp:'10 yrs',location:'Amsterdam, NL',remote:true, score:88, verdict:'Strong fit',   stage:'in_review', source:'linkedin', skills:['Payments','EU markets','PSD2','B2B','Leadership','API'], gaps:[], payments:28,stake:20,data:17,lead:14, str:['Director-level at Adyen — deep EU payments, PSD2, open banking','B2B enterprise product ownership across 12 EU markets'], gap_detail:[], interview_q:"How do you balance short-term merchant needs against long-term platform scalability in payments infrastructure?", shortlist_decision:'Yes', biggest_strength:'Almost perfect profile match', biggest_risk:'Director-level may be overqualified' },
]
