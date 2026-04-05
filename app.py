"""
TalentAI — AI Sourcing Platform
Built with Streamlit
"""
import streamlit as st
import json
from datetime import datetime

# ── Page config (must be first) ───────────────────────────────────────────────
st.set_page_config(
    page_title="TalentAI — Your Sourcing Agent",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Init DB on first run ──────────────────────────────────────────────────────
@st.cache_resource
def startup():
    from db import init_db
    try:
        init_db()
        return True
    except Exception as e:
        return str(e)

_db_status = startup()

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
/* Hide Streamlit default chrome */
#MainMenu, footer, header { visibility: hidden; }
.block-container { padding-top: 1rem; padding-bottom: 1rem; }

/* Cards */
.card {
    background: white;
    border: 1px solid #E5E7EB;
    border-radius: 12px;
    padding: 1rem 1.25rem;
    margin-bottom: 0.75rem;
}
.card:hover { border-color: #9CA3AF; }

/* Score badge */
.score-high { color: #185FA5; font-weight: 700; font-size: 1.4rem; }
.score-mid  { color: #BA7517; font-weight: 700; font-size: 1.4rem; }
.score-low  { color: #A32D2D; font-weight: 700; font-size: 1.4rem; }

/* Verdict pills */
.pill-strong   { background:#EAF3DE; color:#3B6D11; padding:2px 10px; border-radius:20px; font-size:0.75rem; font-weight:600; }
.pill-moderate { background:#FAEEDA; color:#854F0B; padding:2px 10px; border-radius:20px; font-size:0.75rem; font-weight:600; }
.pill-weak     { background:#FCEBEB; color:#A32D2D; padding:2px 10px; border-radius:20px; font-size:0.75rem; font-weight:600; }

/* Sidebar brand */
.brand { font-size:1.3rem; font-weight:700; color:#185FA5; }
.brand-sub { font-size:0.75rem; color:#6B7280; }

/* Metric cards */
.metric-card {
    background: white;
    border: 1px solid #E5E7EB;
    border-radius: 10px;
    padding: 1rem;
    text-align: center;
}
.metric-val { font-size: 2rem; font-weight: 700; color: #185FA5; }
.metric-lbl { font-size: 0.8rem; color: #6B7280; margin-top: 2px; }

/* Tag */
.tag { display:inline-block; background:#E6F1FB; color:#185FA5; padding:2px 8px; border-radius:20px; font-size:0.7rem; margin:2px; }
.tag-gap { background:#FCEBEB; color:#A32D2D; }
</style>
""", unsafe_allow_html=True)

# ── Auth helpers ──────────────────────────────────────────────────────────────
def is_logged_in():
    return bool(st.session_state.get("token") and st.session_state.get("user_id"))

def current_user():
    if not is_logged_in():
        return None
    from db import get_session, User
    db = get_session()
    try:
        return db.query(User).filter_by(id=st.session_state.user_id, active=True).first()
    finally:
        db.close()

def do_logout():
    for k in ["token","user_id","user_name","user_role","page"]:
        st.session_state.pop(k, None)
    st.rerun()

# ── Pages ─────────────────────────────────────────────────────────────────────
def page_login():
    col1, col2, col3 = st.columns([1, 1.2, 1])
    with col2:
        st.markdown("<br><br>", unsafe_allow_html=True)
        st.markdown('<div class="brand">⚡ TalentAI</div>', unsafe_allow_html=True)
        st.markdown('<div class="brand-sub">Your AI Sourcing Agent</div>', unsafe_allow_html=True)
        st.markdown("<br>", unsafe_allow_html=True)

        tab1, tab2 = st.tabs(["Sign in", "Sign up"])

        with tab1:
            with st.form("login_form"):
                st.subheader("Welcome back")
                email = st.text_input("Email", placeholder="you@company.com")
                password = st.text_input("Password", type="password", placeholder="••••••••")
                submitted = st.form_submit_button("Sign in", use_container_width=True, type="primary")
                if submitted:
                    if not email or not password:
                        st.error("Please fill in both fields")
                    else:
                        try:
                            from auth import login_user
                            user, token = login_user(email, password)
                            st.session_state.token    = token
                            st.session_state.user_id  = user.id
                            st.session_state.user_name = user.name
                            st.session_state.user_role = user.role
                            st.session_state.page     = "dashboard"
                            st.success(f"Welcome back, {user.name}!")
                            st.rerun()
                        except ValueError as e:
                            st.error(str(e))
                        except Exception as e:
                            st.error(f"Login failed: {e}")

            st.markdown("---")
            st.caption("Demo accounts")
            c1, c2 = st.columns(2)
            if c1.button("👤 Recruiter demo", use_container_width=True):
                try:
                    from auth import login_user
                    user, token = login_user("recruiter@talentai.com", "demo123")
                    st.session_state.token = token
                    st.session_state.user_id = user.id
                    st.session_state.user_name = user.name
                    st.session_state.user_role = user.role
                    st.session_state.page = "dashboard"
                    st.rerun()
                except Exception as e:
                    st.error(f"Demo login failed: {e}")
            if c2.button("🛡️ Admin demo", use_container_width=True):
                try:
                    from auth import login_user
                    user, token = login_user("admin@talentai.com", "demo123")
                    st.session_state.token = token
                    st.session_state.user_id = user.id
                    st.session_state.user_name = user.name
                    st.session_state.user_role = user.role
                    st.session_state.page = "dashboard"
                    st.rerun()
                except Exception as e:
                    st.error(f"Demo login failed: {e}")

        with tab2:
            with st.form("signup_form"):
                st.subheader("Create account")
                name     = st.text_input("Full name")
                s_email  = st.text_input("Email", key="su_email")
                company  = st.text_input("Company (optional)")
                s_pass   = st.text_input("Password", type="password", key="su_pass")
                s_sub    = st.form_submit_button("Create account", use_container_width=True, type="primary")
                if s_sub:
                    if not name or not s_email or not s_pass:
                        st.error("Name, email and password are required")
                    elif len(s_pass) < 8:
                        st.error("Password must be at least 8 characters")
                    else:
                        try:
                            from auth import signup_user
                            user, token = signup_user(name, s_email, s_pass, company)
                            st.session_state.token = token
                            st.session_state.user_id = user.id
                            st.session_state.user_name = user.name
                            st.session_state.user_role = user.role
                            st.session_state.page = "dashboard"
                            st.success("Account created!")
                            st.rerun()
                        except ValueError as e:
                            st.error(str(e))
                        except Exception as e:
                            st.error(f"Signup failed: {e}")


def page_dashboard():
    user = current_user()
    st.title(f"Good day, {st.session_state.user_name.split()[0]} 👋")
    st.caption("Here's your sourcing overview")

    from db import get_session, Job, Candidate
    db = get_session()
    try:
        jobs       = db.query(Job).filter_by(owner_id=st.session_state.user_id).all()
        total_cands = db.query(Candidate).join(Job).filter(Job.owner_id == st.session_state.user_id).count()
        strong     = db.query(Candidate).join(Job).filter(Job.owner_id == st.session_state.user_id, Candidate.verdict == "Strong fit").count()
        shortlisted = db.query(Candidate).join(Job).filter(Job.owner_id == st.session_state.user_id, Candidate.stage == "shortlisted").count()
    finally:
        db.close()

    c1, c2, c3, c4 = st.columns(4)
    for col, val, lbl in [
        (c1, len(jobs),     "Active Jobs"),
        (c2, total_cands,   "Candidates Sourced"),
        (c3, strong,        "Strong Fits"),
        (c4, shortlisted,   "Shortlisted"),
    ]:
        col.markdown(f'<div class="metric-card"><div class="metric-val">{val}</div><div class="metric-lbl">{lbl}</div></div>', unsafe_allow_html=True)

    st.markdown("---")
    st.subheader("Recent Jobs")
    if not jobs:
        st.info("No jobs yet — go to **Source Candidates** to start your first run")
        if st.button("➕ Start sourcing", type="primary"):
            st.session_state.page = "source"
            st.rerun()
    else:
        for job in jobs[-5:][::-1]:
            c1, c2, c3 = st.columns([4, 1, 1])
            c1.markdown(f"**{job.title}** — *{job.status}*")
            c2.caption(f"{job.created_at.strftime('%d %b') if job.created_at else ''}")
            if c3.button("Open", key=f"open_{job.id}"):
                st.session_state.active_job_id = job.id
                st.session_state.page = "source"
                st.rerun()


def page_source():
    st.title("⚡ Source Candidates")

    from db import get_session, Job, Candidate
    db = get_session()

    # ── Step 1: JD Input ───────────────────────────────────────────────────
    with st.expander("📋 Job Description", expanded=not bool(st.session_state.get("jd_analysis"))):
        job_title = st.text_input("Job Title", value=st.session_state.get("job_title",""), placeholder="e.g. Senior Software Engineer")
        jd_text   = st.text_area("Paste Job Description", value=st.session_state.get("jd_text",""), height=200, placeholder="Paste the full JD here…")
        st.caption("Or upload a file:")
        uploaded = st.file_uploader("Upload JD", type=["txt","pdf","docx"], label_visibility="collapsed")
        if uploaded:
            if uploaded.type == "text/plain":
                jd_text = uploaded.read().decode("utf-8")
            elif uploaded.name.endswith(".pdf"):
                import fitz
                doc = fitz.open(stream=uploaded.read(), filetype="pdf")
                jd_text = "\n".join(p.get_text() for p in doc)
            elif uploaded.name.endswith(".docx"):
                import docx, io
                doc = docx.Document(io.BytesIO(uploaded.read()))
                jd_text = "\n".join(p.text for p in doc.paragraphs)
            st.session_state.jd_text = jd_text

        col1, col2 = st.columns([2,1])
        if col1.button("🧠 Analyse with AI", type="primary", use_container_width=True):
            if not jd_text.strip():
                st.error("Please paste a job description first")
            else:
                with st.spinner("Analysing JD with AI…"):
                    try:
                        from jd_service import analyse_jd
                        analysis = analyse_jd(jd_text)
                        # Save job to DB
                        try:
                            job = Job(owner_id=st.session_state.user_id,
                                      title=job_title or analysis.get("suggested_titles",["Untitled"])[0],
                                      jd_text=jd_text, analysis=analysis, status="analysed")
                            db.add(job); db.commit(); db.refresh(job)
                            st.session_state.active_job_id = job.id
                        except Exception:
                            db.rollback()
                        st.session_state.jd_analysis = analysis
                        st.session_state.job_title   = job_title or analysis.get("suggested_titles",[""])[0]
                        st.session_state.jd_text     = jd_text
                        st.success("✅ JD analysed successfully!")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Analysis failed: {e}\n\nCheck your API key in Settings.")

        if col2.button("💾 Save JD", use_container_width=True):
            if st.session_state.get("active_job_id"):
                try:
                    job = db.query(Job).filter_by(id=st.session_state.active_job_id,
                                                   owner_id=st.session_state.user_id).first()
                    if job:
                        job.title   = job_title or job.title
                        job.jd_text = jd_text
                        db.commit()
                        st.success("✅ JD saved!")
                except Exception as e:
                    db.rollback(); st.error(f"Save failed: {e}")
            else:
                st.info("Analyse the JD first to save it")

    # ── Step 2: Analysis Results ───────────────────────────────────────────
    analysis = st.session_state.get("jd_analysis")
    if analysis:
        with st.expander("📊 JD Analysis", expanded=True):
            col1, col2 = st.columns(2)
            with col1:
                st.markdown(f"**Role:** {analysis.get('role_objective','')}")
                st.markdown(f"**Seniority:** {analysis.get('seniority','')}")
                st.markdown(f"**Implicit expectations:** {analysis.get('implicit_expectations','')}")
            with col2:
                st.markdown("**Scoring Matrix (total = 100pts)**")
                comps = analysis.get("primary_competencies",[]) + analysis.get("secondary_competencies",[])
                for c in comps:
                    st.progress(c.get("weight",0)/100, text=f"{c['name']} — {c.get('weight',0)}pts")

            st.markdown("**Boolean Search Query:**")
            st.code(analysis.get("boolean_strings",{}).get("primary",""), language=None)

        # ── Step 3: Source Profiles ────────────────────────────────────────
        st.markdown("---")
        st.subheader("🔍 Source Profiles")
        platforms_all = ["linkedin","naukri","indeed","github","reed","infojobs","monster","glassdoor"]
        platforms = st.multiselect("Platforms", platforms_all, default=["linkedin"])
        max_cands = st.slider("Max candidates", 5, 100, 25)

        if st.button("🚀 Start Sourcing", type="primary", use_container_width=True):
            if not platforms:
                st.error("Select at least one platform")
            elif not st.session_state.get("active_job_id"):
                st.error("Save the JD first")
            else:
                if not import_meta("SERPAPI_KEY"):
                    st.warning("⚠️ No SerpAPI key configured — go to Settings to add your key. Sourcing will not find real candidates without it.")
                else:
                    with st.spinner("Sourcing candidates… this may take 30-60 seconds"):
                        try:
                            _run_sourcing(st.session_state.active_job_id, analysis, platforms, max_cands, db)
                            st.success("✅ Sourcing complete!")
                            st.rerun()
                        except Exception as e:
                            st.error(f"Sourcing failed: {e}")

        # ── Step 4: Candidates ─────────────────────────────────────────────
        if st.session_state.get("active_job_id"):
            _show_candidates(db)

    db.close()


def import_meta(key):
    import config
    return getattr(config, key, "") or ""


def _run_sourcing(job_id, analysis, platforms, max_cands, db):
    """Run sourcing via SerpAPI and evaluate each candidate."""
    import httpx, config
    from jd_service import evaluate_candidate
    from db import Candidate

    boolean_q = analysis.get("boolean_strings",{}).get("primary","")
    found = []

    for platform in platforms:
        templates = {
            "linkedin":  f'site:linkedin.com/in {boolean_q}',
            "naukri":    f'site:naukri.com {boolean_q}',
            "github":    f'site:github.com {boolean_q}',
            "indeed":    f'site:indeed.com resume {boolean_q}',
            "reed":      f'site:reed.co.uk {boolean_q}',
            "infojobs":  f'site:infojobs.net {boolean_q}',
            "monster":   f'site:monster.com resume {boolean_q}',
            "glassdoor": f'site:glassdoor.com resume {boolean_q}',
        }
        query = templates.get(platform, f'{platform} {boolean_q}')
        try:
            resp = httpx.get("https://serpapi.com/search", params={
                "q": query, "num": max_cands // len(platforms) + 1,
                "api_key": config.SERPAPI_KEY,
            }, timeout=20)
            resp.raise_for_status()
            for item in resp.json().get("organic_results", []):
                found.append({
                    "url":     item.get("link",""),
                    "title":   item.get("title",""),
                    "snippet": item.get("snippet",""),
                    "source":  platform,
                })
        except Exception:
            continue

    # Deduplicate
    seen = set()
    unique = []
    for r in found:
        if r["url"] not in seen:
            seen.add(r["url"]); unique.append(r)

    # Evaluate each
    for item in unique[:max_cands]:
        profile_text = f"{item['title']}\n{item['snippet']}\nURL: {item['url']}"
        try:
            ev = evaluate_candidate(analysis, profile_text)
        except Exception:
            ev = {"total_score":0,"verdict":"Unknown","biggest_strength":"","biggest_risk":""}

        name = item["title"].split(" - ")[0].split("|")[0].strip()[:100]
        c = Candidate(
            job_id=job_id,
            name=name,
            headline=item["title"][:250],
            profile_url=item["url"],
            source=item["source"],
            raw_profile=item["snippet"],
            evaluation=ev,
            score=ev.get("total_score",0),
            verdict=ev.get("verdict",""),
            stage="sourced",
        )
        db.add(c)
    try:
        db.commit()
    except Exception:
        db.rollback()


def _show_candidates(db):
    from db import Candidate, Job
    st.markdown("---")
    st.subheader("👥 Candidates")

    cands = db.query(Candidate).filter_by(job_id=st.session_state.active_job_id)\
               .order_by(Candidate.score.desc()).all()
    if not cands:
        st.info("No candidates yet — run sourcing above to find candidates.")
        return

    # Filters
    fc1, fc2 = st.columns(2)
    filter_verdict = fc1.selectbox("Filter by fit", ["All","Strong fit","Moderate fit","Weak fit","Reject"])
    filter_stage   = fc2.selectbox("Filter by stage", ["All","sourced","shortlisted","in_review","contacted","rejected"])

    filtered = [c for c in cands
                if (filter_verdict == "All" or c.verdict == filter_verdict)
                and (filter_stage == "All" or c.stage == filter_stage)]

    st.caption(f"{len(filtered)} candidates shown")

    for c in filtered:
        ev = c.evaluation or {}
        score_cls = "score-high" if c.score >= 75 else "score-mid" if c.score >= 60 else "score-low"
        verdict_cls = "pill-strong" if c.verdict=="Strong fit" else "pill-moderate" if c.verdict=="Moderate fit" else "pill-weak"

        with st.container():
            col1, col2, col3 = st.columns([4, 1, 1])
            with col1:
                st.markdown(f"**{c.name}**")
                st.caption(f"{c.headline[:80] if c.headline else ''} · {c.source}")
                tags_html = " ".join([f'<span class="tag">{s}</span>' for s in (ev.get("skills_matched",[])[:4])])
                gap_html  = " ".join([f'<span class="tag tag-gap">{g}</span>' for g in (ev.get("skills_gap",[])[:2])])
                st.markdown(tags_html + gap_html, unsafe_allow_html=True)
            with col2:
                st.markdown(f'<div class="{score_cls}">{round(c.score)}</div>', unsafe_allow_html=True)
                st.markdown(f'<span class="{verdict_cls}">{c.verdict}</span>', unsafe_allow_html=True)
            with col3:
                new_stage = st.selectbox("Stage", ["sourced","shortlisted","in_review","contacted","rejected"],
                                          index=["sourced","shortlisted","in_review","contacted","rejected"].index(c.stage or "sourced"),
                                          key=f"stage_{c.id}", label_visibility="collapsed")
                if new_stage != c.stage:
                    c.stage = new_stage
                    try: db.commit()
                    except Exception: db.rollback()

            # Expandable detail
            with st.expander(f"📋 Full evaluation — {c.name}"):
                d1, d2 = st.columns(2)
                d1.markdown(f"**Biggest strength:** {ev.get('biggest_strength','—')}")
                d1.markdown(f"**Biggest risk:** {ev.get('biggest_risk','—')}")
                d1.markdown(f"**Shortlist:** {ev.get('shortlist_decision','—')}")
                if c.profile_url:
                    d2.markdown(f"[🔗 View profile]({c.profile_url})")
                if ev.get("top_interview_question"):
                    st.info(f"💬 **Top question:** {ev['top_interview_question']}")
                if ev.get("gaps_critical"):
                    st.warning("**Critical gaps:** " + " · ".join(ev["gaps_critical"]))

                btn1, btn2 = st.columns(2)
                if btn1.button("📝 Generate questionnaire", key=f"q_{c.id}"):
                    with st.spinner("Generating…"):
                        try:
                            from db import get_session, Job
                            db2 = get_session()
                            job = db2.query(Job).filter_by(id=c.job_id).first()
                            from jd_service import generate_questionnaire
                            q = generate_questionnaire(job.analysis or {}, ev)
                            for sec in q.get("sections",[]):
                                st.markdown(f"**{sec['title']}**")
                                for qi, question in enumerate(sec.get("questions",[]), 1):
                                    st.markdown(f"{qi}. {question}")
                            db2.close()
                        except Exception as e:
                            st.error(f"Failed: {e}")

                if btn2.button("✉️ Generate outreach", key=f"out_{c.id}"):
                    with st.spinner("Generating outreach…"):
                        try:
                            from db import get_session, Job
                            db2 = get_session()
                            job = db2.query(Job).filter_by(id=c.job_id).first()
                            from jd_service import generate_outreach
                            out = generate_outreach(
                                role_title=job.title if job else "this role",
                                name=c.name, headline=c.headline or "",
                                company=c.company or "", strength=ev.get("biggest_strength",""),
                            )
                            for msg in out.get("messages",[]):
                                st.markdown(f"**{msg['tone']}** ({len(msg['text'])} chars)")
                                st.code(msg["text"], language=None)
                            db2.close()
                        except Exception as e:
                            st.error(f"Failed: {e}")
            st.divider()


def page_pipeline():
    st.title("📋 Candidate Pipeline")
    from db import get_session, Candidate, Job
    db = get_session()
    try:
        cands = db.query(Candidate).join(Job)\
                  .filter(Job.owner_id == st.session_state.user_id)\
                  .order_by(Candidate.score.desc()).all()

        stages = ["sourced","shortlisted","in_review","contacted","rejected"]
        stage_labels = {"sourced":"Sourced","shortlisted":"Shortlisted","in_review":"In Review",
                        "contacted":"Contacted","rejected":"Rejected"}
        cols = st.columns(len(stages))
        for col, stage in zip(cols, stages):
            with col:
                stage_cands = [c for c in cands if c.stage == stage]
                st.markdown(f"**{stage_labels[stage]}** ({len(stage_cands)})")
                for c in stage_cands:
                    score_cls = "score-high" if c.score>=75 else "score-mid" if c.score>=60 else "score-low"
                    st.markdown(
                        f'<div class="card"><b>{c.name}</b><br>'
                        f'<small>{c.company or ""}</small><br>'
                        f'<span class="{score_cls}" style="font-size:1rem">{round(c.score)}</span></div>',
                        unsafe_allow_html=True
                    )
    finally:
        db.close()


def page_saved_jds():
    st.title("📁 Saved Job Descriptions")
    from db import get_session, Job
    db = get_session()
    try:
        jobs = db.query(Job).filter_by(owner_id=st.session_state.user_id)\
                 .order_by(Job.created_at.desc()).all()
        if not jobs:
            st.info("No saved JDs yet — go to Source Candidates to create one")
            return

        for job in jobs:
            c1, c2, c3, c4 = st.columns([4, 1, 1, 1])
            c1.markdown(f"**{job.title}**")
            c2.caption(f"*{job.status}*")
            if c3.button("Use", key=f"use_{job.id}"):
                st.session_state.active_job_id = job.id
                st.session_state.jd_analysis   = job.analysis
                st.session_state.jd_text       = job.jd_text
                st.session_state.job_title     = job.title
                st.session_state.page = "source"
                st.rerun()
            if c4.button("🗑️", key=f"del_{job.id}"):
                db.delete(job); db.commit()
                st.rerun()
    finally:
        db.close()


def page_settings():
    st.title("⚙️ Settings")
    from db import get_session, UserSettings
    db = get_session()
    try:
        s = db.query(UserSettings).filter_by(user_id=st.session_state.user_id).first()
        keys = s.api_keys or {} if s else {}

        st.subheader("AI Language Model")
        providers = ["groq","anthropic","openai","google"]
        active_model = st.selectbox("Default provider", providers,
                                     index=providers.index(s.active_model if s else "groq"))

        st.subheader("API Keys")
        new_keys = {}
        for p in ["groq","anthropic","openai","google"]:
            key_val = st.text_input(f"{p.title()} API key",
                                    value=keys.get(p,""),
                                    type="password",
                                    placeholder=f"Enter {p} key…")
            if key_val: new_keys[p] = key_val

        st.subheader("Search Provider")
        serp_key = st.text_input("SerpAPI key", value=keys.get("serpapi",""),
                                  type="password", placeholder="Enter SerpAPI key…")
        if serp_key: new_keys["serpapi"] = serp_key

        max_cands = st.slider("Max candidates per run", 10, 200, s.max_candidates if s else 50)

        if st.button("💾 Save settings", type="primary"):
            if not s:
                s = UserSettings(user_id=st.session_state.user_id)
                db.add(s)
            s.active_model   = active_model
            s.max_candidates = max_cands
            existing = s.api_keys or {}
            existing.update(new_keys)
            s.api_keys = existing
            try:
                db.commit()
                st.success("✅ Settings saved!")
            except Exception as e:
                db.rollback(); st.error(f"Failed: {e}")
    finally:
        db.close()


def page_users():
    st.title("👥 User Management")
    if st.session_state.get("user_role") != "admin":
        st.error("Admin access required")
        return

    from db import get_session, User
    db = get_session()
    try:
        users = db.query(User).order_by(User.created_at.desc()).all()
        for u in users:
            c1, c2, c3, c4 = st.columns([3,1,1,1])
            c1.markdown(f"**{u.name}** — {u.email}")
            c2.caption(f"*{u.role}*")
            c3.caption("✅ Active" if u.active else "❌ Inactive")
            if c4.button("Toggle", key=f"tog_{u.id}"):
                u.active = not u.active; db.commit(); st.rerun()

        st.markdown("---")
        st.subheader("Add user")
        with st.form("add_user"):
            nu_name  = st.text_input("Name")
            nu_email = st.text_input("Email")
            nu_pass  = st.text_input("Password", type="password")
            nu_role  = st.selectbox("Role", ["standard","admin"])
            if st.form_submit_button("Create user"):
                if nu_name and nu_email and nu_pass:
                    from auth import hash_password
                    db.add(User(name=nu_name, email=nu_email, company="",
                                hashed_pw=hash_password(nu_pass), role=nu_role))
                    try: db.commit(); st.success("User created"); st.rerun()
                    except Exception as e: db.rollback(); st.error(str(e))
    finally:
        db.close()


def page_reports():
    st.title("📊 Reports")
    from db import get_session, Candidate, Job
    from sqlalchemy import func
    db = get_session()
    try:
        total = db.query(func.count(Candidate.id)).join(Job)\
                  .filter(Job.owner_id==st.session_state.user_id).scalar() or 0
        avg   = db.query(func.avg(Candidate.score)).join(Job)\
                  .filter(Job.owner_id==st.session_state.user_id).scalar() or 0
        strong = db.query(func.count(Candidate.id)).join(Job)\
                   .filter(Job.owner_id==st.session_state.user_id, Candidate.verdict=="Strong fit").scalar() or 0
        shortlisted = db.query(func.count(Candidate.id)).join(Job)\
                        .filter(Job.owner_id==st.session_state.user_id, Candidate.stage=="shortlisted").scalar() or 0

        c1,c2,c3,c4 = st.columns(4)
        for col, val, lbl in [(c1,total,"Total Sourced"),(c2,round(avg,1),"Avg Score"),(c3,strong,"Strong Fits"),(c4,shortlisted,"Shortlisted")]:
            col.metric(lbl, val)

        st.markdown("---")
        # Stage breakdown
        stages = ["sourced","shortlisted","in_review","contacted","rejected"]
        counts = []
        for stage in stages:
            n = db.query(func.count(Candidate.id)).join(Job)\
                  .filter(Job.owner_id==st.session_state.user_id, Candidate.stage==stage).scalar() or 0
            counts.append(n)

        import pandas as pd
        df = pd.DataFrame({"Stage": stages, "Count": counts})
        st.bar_chart(df.set_index("Stage"))
    finally:
        db.close()


# ── Main router ───────────────────────────────────────────────────────────────
def main():
    if not is_logged_in():
        page_login()
        return

    # Sidebar
    with st.sidebar:
        st.markdown('<div class="brand">⚡ TalentAI</div>', unsafe_allow_html=True)
        st.markdown('<div class="brand-sub">Your Sourcing Agent</div>', unsafe_allow_html=True)
        st.markdown("<br>", unsafe_allow_html=True)

        pages = {
            "dashboard":  "🏠 Dashboard",
            "source":     "🔍 Source Candidates",
            "pipeline":   "📋 Pipeline",
            "saved_jds":  "📁 Saved JDs",
            "reports":    "📊 Reports",
            "settings":   "⚙️ Settings",
        }
        if st.session_state.get("user_role") == "admin":
            pages["users"] = "👥 Users"

        current = st.session_state.get("page","dashboard")
        for key, label in pages.items():
            if st.button(label, use_container_width=True,
                          type="primary" if key==current else "secondary",
                          key=f"nav_{key}"):
                st.session_state.page = key
                st.rerun()

        st.markdown("<br>", unsafe_allow_html=True)
        st.caption(f"👤 {st.session_state.user_name}")
        if st.button("🚪 Logout", use_container_width=True):
            do_logout()

    # Route
    page = st.session_state.get("page","dashboard")
    if   page == "dashboard": page_dashboard()
    elif page == "source":    page_source()
    elif page == "pipeline":  page_pipeline()
    elif page == "saved_jds": page_saved_jds()
    elif page == "reports":   page_reports()
    elif page == "settings":  page_settings()
    elif page == "users":     page_users()
    else: page_dashboard()


if __name__ == "__main__":
    main()
