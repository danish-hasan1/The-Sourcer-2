import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import {
  Zap, Search, BarChart2, GitBranch, ArrowRight,
  CheckCircle, Star, Globe, FileText, Users, ChevronRight,
  Sparkles, Shield, Clock, Target
} from 'lucide-react'

// ─── Data ────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: FileText,
    title: 'Upload any Job Description',
    desc: 'Paste text, drop a PDF or Word doc. The AI extracts role intent, competency weights, and builds a 100-point scoring matrix — in seconds.',
    color: 'bg-brand-50 text-brand-600',
  },
  {
    icon: Globe,
    title: 'Multi-platform sourcing',
    desc: 'Simultaneously searches LinkedIn, GitHub, Naukri, Indeed, Reed, InfoJobs and more. Boolean strings are auto-generated from your JD.',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    icon: Target,
    title: 'AI-weighted scoring',
    desc: 'Every candidate is scored 0–100 against your specific role. Not keyword matching — deep evaluation of depth, ownership, and impact.',
    color: 'bg-green-50 text-green-600',
  },
  {
    icon: GitBranch,
    title: 'Built-in pipeline',
    desc: 'Drag candidates from Sourced → Shortlisted → In Review → Contacted. A mini ATS that lives right inside your sourcing workflow.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: Sparkles,
    title: 'CV enrichment questionnaire',
    desc: 'Auto-generates targeted questions per candidate based on detected gaps — ready to send, no editing needed.',
    color: 'bg-pink-50 text-pink-600',
  },
  {
    icon: BarChart2,
    title: 'Sourcing analytics',
    desc: 'Track match rates, source mix, fit distribution and weekly sourcing volume across all your open roles.',
    color: 'bg-teal-50 text-teal-600',
  },
]

const STEPS = [
  { num: '01', title: 'Upload your JD', desc: 'Paste or upload any job description. No template required.' },
  { num: '02', title: 'AI analyses the role', desc: 'Extracts intent, builds a weighted competency matrix, generates Boolean strings.' },
  { num: '03', title: 'Source across platforms', desc: 'Select platforms. The AI searches, parses, and evaluates every profile.' },
  { num: '04', title: 'Review ranked candidates', desc: 'Scored, explained, interview-ready — sorted by fit. Move them into your pipeline.' },
]

const STATS = [
  { value: '6×',   label: 'Faster than manual sourcing' },
  { value: '100pt',label: 'Weighted scoring per role'    },
  { value: '8+',   label: 'Platforms searched at once'   },
  { value: '0',    label: 'Boolean strings written by you'},
]

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    sub: 'No credit card needed',
    features: ['5 sourcing runs / month','Up to 25 candidates per run','LinkedIn + Indeed','Basic scoring matrix','1 user'],
    cta: 'Start free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$49',
    sub: '/ month',
    features: ['Unlimited sourcing runs','Up to 100 candidates per run','All 8 platforms','Full weighted matrix','CV questionnaire generator','5 users','Priority support'],
    cta: 'Start 14-day trial',
    highlight: true,
  },
  {
    name: 'Team',
    price: '$149',
    sub: '/ month',
    features: ['Everything in Pro','Unlimited candidates','Custom LLM API key','Full pipeline / ATS','Analytics dashboard','Unlimited users','SSO / SAML'],
    cta: 'Contact sales',
    highlight: false,
  },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate   = useNavigate()
  const heroRef    = useRef(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── Nav ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-6">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-md shadow-brand-600/20">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <span className="text-[15px] font-bold text-gray-900 leading-none">TalentAI</span>
              <span className="text-[10px] text-gray-400 block leading-none mt-0.5 tracking-wide">SOURCING AGENT</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 ml-8">
            {['Features','How it works','Pricing'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(' ','-')}`}
                className="text-[13px] text-gray-500 hover:text-gray-900 transition">{item}</a>
            ))}
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')}
              className="text-[13px] text-gray-600 hover:text-gray-900 transition px-3 py-1.5">
              Sign in
            </button>
            <button onClick={() => navigate('/signup')}
              className="text-[13px] bg-brand-600 hover:bg-brand-800 text-white px-4 py-2 rounded-lg transition font-medium">
              Get started free
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" />
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '52px 52px' }} />
        {/* Glow blobs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8">
            <Sparkles size={12} className="text-brand-300" />
            <span className="text-[12px] text-white/80 font-medium">AI-powered sourcing · 8 platforms · 100-point scoring</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            Your AI<br />
            <span className="text-brand-300">Sourcing Agent</span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-4 leading-relaxed">
            Upload a job description. TalentAI analyses the role, searches candidates across LinkedIn, GitHub, Naukri and more, then ranks each one with a weighted match score.
          </p>
          <p className="text-[15px] text-brand-300/80 font-medium mb-10">
            From JD to ranked shortlist in minutes — not days.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
            <button onClick={() => navigate('/signup')}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-7 py-3.5 rounded-xl font-semibold text-[15px] transition shadow-lg shadow-brand-600/30 group">
              Start sourcing free
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button onClick={() => navigate('/login')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white px-7 py-3.5 rounded-xl font-medium text-[15px] transition">
              Sign in to dashboard
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {STATS.map((s,i) => (
              <div key={i} className="bg-white/8 border border-white/10 rounded-xl py-4 px-3">
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-[11px] text-white/50 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[12px] font-semibold text-brand-600 uppercase tracking-widest mb-3">How it works</div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Sourcing on autopilot</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Four steps from job description to ranked candidates — the AI does the rest.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {STEPS.map((s,i) => (
              <div key={i} className="relative">
                {i < STEPS.length-1 && (
                  <div className="hidden md:block absolute top-7 left-full w-full h-px bg-gradient-to-r from-brand-200 to-transparent z-0" />
                )}
                <div className="relative bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="text-[11px] font-bold text-brand-600 bg-brand-50 rounded-lg px-2 py-1 inline-block mb-4">{s.num}</div>
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-[13px] text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[12px] font-semibold text-brand-600 uppercase tracking-widest mb-3">Features</div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Everything a recruiter needs</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Built around the real workflow — not a generic AI wrapper.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((f,i) => {
              const Icon = f.icon
              return (
                <div key={i} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                    <Icon size={18} />
                  </div>
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-[13px] text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Social proof strip ── */}
      <section className="py-16 px-6 bg-brand-600">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { quote: '"Cut our sourcing time from 2 days to 20 minutes. The scoring matrix is the real magic."', name: 'Head of Talent, SaaS startup' },
              { quote: '"Finally a tool that understands the JD properly — not just keyword matching candidates."', name: 'Senior Recruiter, FinTech' },
              { quote: '"The CV questionnaire alone saved me hours. Sent it directly to candidates."', name: 'Talent Partner, Growth stage' },
            ].map((t,i) => (
              <div key={i} className="bg-white/10 border border-white/20 rounded-xl p-5">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_,j) => <Star key={j} size={12} className="text-amber-300 fill-amber-300" />)}
                </div>
                <p className="text-[13px] text-white/80 leading-relaxed mb-3">{t.quote}</p>
                <p className="text-[11px] text-white/50 font-medium">{t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[12px] font-semibold text-brand-600 uppercase tracking-widest mb-3">Pricing</div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Simple, transparent pricing</h2>
            <p className="text-gray-500 mt-3">Start free. Scale as you hire.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 items-stretch">
            {PLANS.map((plan,i) => (
              <div key={i} className={`rounded-2xl border p-7 flex flex-col ${plan.highlight ? 'bg-brand-600 border-brand-600 shadow-xl shadow-brand-600/20' : 'bg-gray-50 border-gray-200'}`}>
                <div>
                  {plan.highlight && (
                    <div className="inline-block bg-white/20 text-white text-[11px] font-semibold px-3 py-1 rounded-full mb-4">Most popular</div>
                  )}
                  <div className={`text-[15px] font-semibold mb-1 ${plan.highlight ? 'text-white/80' : 'text-gray-500'}`}>{plan.name}</div>
                  <div className={`text-4xl font-bold mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.price}</div>
                  <div className={`text-[13px] mb-6 ${plan.highlight ? 'text-white/60' : 'text-gray-400'}`}>{plan.sub}</div>
                  <ul className="space-y-2.5 mb-8">
                    {plan.features.map((f,j) => (
                      <li key={j} className="flex items-start gap-2">
                        <CheckCircle size={14} className={`mt-0.5 flex-shrink-0 ${plan.highlight ? 'text-white/70' : 'text-green-500'}`} />
                        <span className={`text-[13px] ${plan.highlight ? 'text-white/80' : 'text-gray-600'}`}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button onClick={() => navigate('/signup')}
                  className={`mt-auto w-full py-3 rounded-xl font-semibold text-[14px] transition ${plan.highlight ? 'bg-white text-brand-600 hover:bg-gray-50' : 'bg-brand-600 text-white hover:bg-brand-800'}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '52px 52px' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-brand-600/20 rounded-full blur-3xl" />
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to source smarter?</h2>
          <p className="text-white/50 text-lg mb-10">Join recruiters who've replaced manual sourcing with TalentAI.</p>
          <button onClick={() => navigate('/signup')}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-8 py-4 rounded-xl font-semibold text-[16px] transition shadow-xl shadow-brand-600/30 group">
            Start for free — no card needed
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap size={13} className="text-white" />
            </div>
            <span className="text-[14px] font-bold text-white">TalentAI</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest ml-1">Sourcing Agent</span>
          </div>
          <div className="flex items-center gap-6">
            {['Privacy','Terms','Contact'].map(item => (
              <a key={item} href="#" className="text-[12px] text-gray-500 hover:text-gray-300 transition">{item}</a>
            ))}
          </div>
          <p className="text-[12px] text-gray-600">© 2026 TalentAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
