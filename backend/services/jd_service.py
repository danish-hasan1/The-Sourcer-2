"""
JD Analysis Service
Implements the 6-prompt pipeline from the attached prompt documents.
All prompts are faithful to the original intent; responses are returned as structured JSON.
"""
from services.llm_service import call_llm, extract_json

SYSTEM = (
    "You are a senior recruitment intelligence AI. "
    "You MUST analyse the EXACT job description provided — do NOT use examples, templates, or defaults. "
    "Every field in your response must be derived specifically from the JD text given. "
    "Always respond with valid JSON only — no preamble, no markdown fences, no text outside the JSON."
)

# ─── Prompt 1 + 2 combined: JD Understanding + Scoring Matrix ─────────────────
ANALYSE_PROMPT = """
You are acting as the original hiring decision-maker who authored the job description below,
combined with the perspective of a senior talent evaluator who understands how this specific
role is actually assessed in real hiring situations.

CRITICAL: You must analyse the EXACT job description provided. Do NOT default to any generic
role type. If the JD is for an engineer, analyse an engineering role. If it is for a designer,
analyse a design role. Every field must reflect the actual content of THIS JD.

Rules:
- Do NOT summarize the JD — infer intent, priorities, and unstated expectations
- Do NOT use generic or template answers
- Scoring weights must total EXACTLY 100 points
- Weight by actual hiring importance for THIS specific role, not keyword frequency
- The boolean_strings must include job titles and skills specific to THIS role

Job Description:
===START JD===
{jd_text}
===END JD===

Based ONLY on the JD above, respond with this exact JSON structure (no other text):
{{
  "role_objective": "What real-world problem does THIS specific role solve — based on the JD above",
  "seniority": "Exact seniority level inferred from THIS JD",
  "ownership": "Degree of ownership described in THIS JD",
  "primary_competencies": [
    {{
      "name": "Competency name specific to this role",
      "weight": 25,
      "why": "Why this competency is critical for THIS specific role",
      "strong_evidence": "What strong evidence looks like on a CV for this role",
      "weak_evidence": "What weak evidence looks like"
    }}
  ],
  "secondary_competencies": [
    {{"name": "Nice-to-have competency for this role", "weight": 10}}
  ],
  "implicit_expectations": "Skills and behaviours assumed but not written in THIS JD",
  "evaluation_biases": "What THIS hiring manager will prioritise during screening",
  "non_negotiables": ["Must-have from THIS JD that would trigger rejection"],
  "ideal_candidate_brief": "2-3 sentence brief of the ideal candidate FOR THIS SPECIFIC ROLE",
  "boolean_strings": {{
    "primary": "Boolean string using titles and skills FROM THIS JD",
    "broad": "Broader discovery string for THIS role type",
    "narrow": "High-precision string for THIS role"
  }},
  "suggested_titles": ["Relevant job titles for THIS role"],
  "suggested_platforms": ["linkedin", "naukri", "indeed", "github", "reed", "infojobs"]
}}
"""

# ─── Prompt 3: CV Evaluation ───────────────────────────────────────────────────
EVALUATE_PROMPT = """
You are a senior recruitment professional evaluating a candidate against a pre-defined
scoring matrix for a SPECIFIC role.

Evaluation rules:
- Evaluate against the SPECIFIC role in the job analysis, not a generic benchmark
- Do NOT rely on keyword presence alone
- Infer skills from role scope, career trajectory, and demonstrated ownership
- Experienced professionals often omit obvious skills — assume possible omission
- Evaluate depth, ownership, scale, and outcomes — not just tool mentions

Job Analysis (scoring matrix and competencies):
{analysis}

Candidate Profile:
{profile}

Respond ONLY with this JSON:
{{
  "name": "candidate name",
  "headline": "their current role and company",
  "seniority_apparent": "entry/mid/senior/lead/head",
  "domain_alignment": "How well their domain matches this specific role",
  "skills_matched": ["skills they clearly have that match this role"],
  "skills_gap": ["skills this role needs that they lack"],
  "category_scores": {{
    "competency_name": {{"awarded": 20, "max": 25, "evidence": "specific evidence from their profile", "strength": "Strong|Moderate|Weak|Missing"}}
  }},
  "implicit_inferences": ["skills inferred from their experience even if not stated"],
  "total_score": 75,
  "verdict": "Strong fit|Moderate fit|Weak fit|Reject",
  "shortlist_decision": "Yes|No|Borderline",
  "biggest_strength": "single biggest strength for THIS role",
  "biggest_risk": "single biggest risk for THIS role",
  "confidence": "High|Medium|Low",
  "interview_questions": ["question 1", "question 2", "question 3"],
  "top_interview_question": "the single most important question to ask",
  "gaps_critical": ["critical gaps that could disqualify"],
  "gaps_trainable": ["gaps that could be learned on the job"]
}}
"""

# ─── Prompt 5: CV Enrichment Questionnaire ────────────────────────────────────
QUESTIONNAIRE_PROMPT = """
You are a senior hiring manager generating a targeted clarification questionnaire
for a candidate based on their CV evaluation for a specific role.

Purpose: uncover relevant experience that may exist but was not clearly expressed.
Never assume incompetence — assume possible omission or brevity.
Questions must be role-specific — not generic.

Job Analysis:
{analysis}

CV Evaluation:
{evaluation}

Respond ONLY with this JSON:
{{
  "sections": [
    {{
      "title": "1. Role-Relevant Experience Clarification",
      "questions": ["Specific question about this role", "Another specific question"]
    }},
    {{
      "title": "2. Depth, Complexity & Proficiency",
      "questions": ["Question about scale/complexity", "Question about tools/methods"]
    }},
    {{
      "title": "3. Adjacent or Transferable Experience",
      "questions": ["Question about transferable experience", "Question about related work"]
    }},
    {{
      "title": "4. Implicit Seniority & Behavioural Capabilities",
      "questions": ["Question about leadership/influence", "Question about decision-making"]
    }},
    {{
      "title": "5. Ownership, Impact & Outcomes",
      "questions": ["Question about measurable outcomes", "Question about business impact"]
    }}
  ]
}}
"""


async def analyse_jd(jd_text: str, provider: str | None = None) -> dict:
    if not jd_text or not jd_text.strip():
        raise ValueError("JD text is empty")
    prompt = ANALYSE_PROMPT.format(jd_text=jd_text.strip())
    raw = await call_llm(prompt, provider=provider, system=SYSTEM, max_tokens=4096)
    result = extract_json(raw)
    # Validate we got a real analysis, not a default
    if not result.get("role_objective") or not result.get("primary_competencies"):
        raise ValueError("LLM returned incomplete analysis")
    return result


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
