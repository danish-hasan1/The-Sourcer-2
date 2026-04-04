"""
JD Analysis Service
Implements the 6-prompt pipeline from the attached prompt documents.
All prompts are faithful to the original intent; responses are returned as structured JSON.
"""
from services.llm_service import call_llm, extract_json

SYSTEM = "You are a senior recruitment intelligence AI that understands hiring intent deeply. Always respond with valid JSON only — no preamble, no markdown, no commentary outside the JSON."

# ─── Prompt 1 + 2 combined: JD Understanding + Scoring Matrix ─────────────────
ANALYSE_PROMPT = """
You are acting as the original hiring decision-maker who authored this job description,
combined with the perspective of a senior talent evaluator.

Your goal: understand the JD EXACTLY as intended, then build a weighted scoring framework.

Rules:
- Do NOT summarize. Infer intent, priorities, and unstated expectations.
- Assume the JD may be incomplete or loosely written.
- Scoring weights must total exactly 100.
- Weight by actual hiring importance, NOT keyword frequency.

Job Description:
{jd_text}

Respond ONLY with this JSON structure:
{{
  "role_objective": "string",
  "seniority": "string",
  "ownership": "string",
  "primary_competencies": [
    {{"name": "string", "weight": number, "why": "string", "strong_evidence": "string", "weak_evidence": "string"}}
  ],
  "secondary_competencies": [
    {{"name": "string", "weight": number}}
  ],
  "implicit_expectations": "string",
  "evaluation_biases": "string",
  "non_negotiables": ["string"],
  "ideal_candidate_brief": "string",
  "boolean_strings": {{
    "primary": "string",
    "broad": "string",
    "narrow": "string"
  }},
  "location": "string",
  "suggested_titles": ["string"],
  "suggested_platforms": ["linkedin", "naukri", "indeed", "github", "reed", "infojobs"]
}}
"""

# ─── Prompt 3: CV Evaluation ───────────────────────────────────────────────────
EVALUATE_PROMPT = """
You are a senior recruitment professional evaluating a candidate against a pre-defined
scoring matrix.

Evaluation rules:
- Do NOT rely on keyword presence alone.
- Infer skills from role scope, career trajectory, and demonstrated ownership.
- Experienced professionals often omit foundational skills — assume possible omission.
- Evaluate depth, scale, outcomes — not just tool mentions.

Job Analysis (scoring matrix and competencies):
{analysis}

Candidate Profile:
{profile}

Respond ONLY with this JSON:
{{
  "name": "string",
  "headline": "string",
  "seniority_apparent": "string",
  "domain_alignment": "string",
  "skills_matched": ["string"],
  "skills_gap": ["string"],
  "category_scores": {{
    "competency_name": {{"awarded": number, "max": number, "evidence": "string", "strength": "Strong|Moderate|Weak|Missing"}}
  }},
  "implicit_inferences": ["string"],
  "total_score": number,
  "verdict": "Strong fit|Moderate fit|Weak fit|Reject",
  "shortlist_decision": "Yes|No|Borderline",
  "biggest_strength": "string",
  "biggest_risk": "string",
  "confidence": "High|Medium|Low",
  "interview_questions": ["string"],
  "top_interview_question": "string",
  "gaps_critical": ["string"],
  "gaps_trainable": ["string"]
}}
"""

# ─── Prompt 5: CV Enrichment Questionnaire ────────────────────────────────────
QUESTIONNAIRE_PROMPT = """
You are a senior hiring manager generating a targeted clarification questionnaire
for a candidate based on their CV evaluation.

Purpose: uncover relevant experience that may exist but was not clearly expressed.
Never assume incompetence — assume possible omission or brevity.

Job Analysis:
{analysis}

CV Evaluation:
{evaluation}

Respond ONLY with this JSON:
{{
  "sections": [
    {{
      "title": "1. Role-Relevant Experience Clarification",
      "questions": ["string", "string"]
    }},
    {{
      "title": "2. Depth, Complexity & Proficiency",
      "questions": ["string", "string"]
    }},
    {{
      "title": "3. Adjacent or Transferable Experience",
      "questions": ["string", "string"]
    }},
    {{
      "title": "4. Implicit Seniority & Behavioral Capabilities",
      "questions": ["string", "string"]
    }},
    {{
      "title": "5. Ownership, Impact & Outcomes",
      "questions": ["string", "string"]
    }}
  ]
}}
"""


async def analyse_jd(jd_text: str, provider: str | None = None) -> dict:
    prompt = ANALYSE_PROMPT.format(jd_text=jd_text)
    raw = await call_llm(prompt, provider=provider, system=SYSTEM, max_tokens=4096)
    return extract_json(raw)


async def evaluate_candidate(analysis: dict, profile: str, provider: str | None = None) -> dict:
    import json
    prompt = EVALUATE_PROMPT.format(
        analysis=json.dumps(analysis, indent=2),
        profile=profile,
    )
    raw = await call_llm(prompt, provider=provider, system=SYSTEM, max_tokens=3000)
    return extract_json(raw)


async def generate_questionnaire(analysis: dict, evaluation: dict, provider: str | None = None) -> dict:
    import json
    prompt = QUESTIONNAIRE_PROMPT.format(
        analysis=json.dumps(analysis, indent=2),
        evaluation=json.dumps(evaluation, indent=2),
    )
    raw = await call_llm(prompt, provider=provider, system=SYSTEM, max_tokens=3000)
    return extract_json(raw)


OUTREACH_PROMPT = """
You are an expert talent acquisition specialist writing a personalised LinkedIn cold outreach message.

Write a concise, compelling outreach message for the following candidate.
The message must:
- Be 4-6 sentences max (no longer — recruiters lose candidates with long messages)
- Lead with a specific observation from their profile (not generic flattery)
- Mention the role title and one specific aspect that would be compelling to THEM
- End with a low-friction call to action (e.g. "worth a 15-min chat?")
- Sound human, not templated — avoid clichés like "I came across your profile"
- NOT mention their score or evaluation — this is external-facing

Candidate name: {name}
Candidate headline/role: {headline}
Candidate company: {company}
Candidate location: {location}
Candidate strengths (internal context only): {biggest_strength}

Role being hired for: {role_objective}
Key reason this candidate fits: {fit_reason}

Respond ONLY with this JSON:
{{
  "subject": "string (short LinkedIn connection request note, max 300 chars)",
  "message": "string (full InMail / email body, 4-6 sentences)",
  "follow_up": "string (short 2-3 sentence follow-up if no response after 5 days)"
}}
"""


async def generate_outreach_message(
    candidate_name: str,
    candidate_headline: str,
    candidate_company: str,
    candidate_location: str,
    biggest_strength: str,
    role_objective: str,
    fit_reason: str,
    provider: str | None = None,
) -> dict:
    prompt = OUTREACH_PROMPT.format(
        name=candidate_name,
        headline=candidate_headline or "Professional",
        company=candidate_company or "their current company",
        location=candidate_location or "",
        biggest_strength=biggest_strength or "strong relevant background",
        role_objective=role_objective or "the role",
        fit_reason=fit_reason or "their profile is a strong match",
    )
    raw = await call_llm(prompt, provider=provider, system=SYSTEM, max_tokens=1000)
    return extract_json(raw)
