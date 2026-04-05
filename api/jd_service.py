from llm import call_llm, extract_json

SYSTEM = (
    "You are a senior recruitment intelligence AI. "
    "Analyse the EXACT job description provided — do NOT use templates or defaults. "
    "Respond with valid JSON only — no preamble, no markdown fences."
)

ANALYSE_PROMPT = """
You are the original hiring decision-maker who authored this JD, combined with a senior talent evaluator.

CRITICAL: Analyse THIS EXACT job description. Do NOT default to any generic role.
Every field must reflect the actual content of this specific JD.
Weights must total EXACTLY 100.

Job Description:
===START JD===
{jd_text}
===END JD===

Respond ONLY with this JSON (no other text):
{{
  "role_objective": "What THIS role solves based on the JD",
  "seniority": "Seniority inferred from THIS JD",
  "ownership": "Ownership level described in THIS JD",
  "primary_competencies": [
    {{"name": "string", "weight": 25, "why": "string", "strong_evidence": "string", "weak_evidence": "string"}}
  ],
  "secondary_competencies": [
    {{"name": "string", "weight": 10}}
  ],
  "implicit_expectations": "string",
  "evaluation_biases": "string",
  "non_negotiables": ["string"],
  "ideal_candidate_brief": "string",
  "boolean_strings": {{
    "primary": "Boolean using titles/skills FROM THIS JD",
    "broad": "Broader discovery string",
    "narrow": "High-precision string"
  }},
  "suggested_titles": ["string"],
  "suggested_platforms": ["linkedin", "naukri", "indeed", "github", "reed", "infojobs"]
}}
"""

EVALUATE_PROMPT = """
Senior recruiter evaluating a candidate against a specific role's scoring matrix.

Rules:
- Evaluate against THIS specific role, not generic benchmarks
- Infer skills from trajectory and ownership, not just keywords
- Evaluate depth, scale, outcomes

Job Analysis:
{analysis}

Candidate Profile:
{profile}

Respond ONLY with JSON:
{{
  "name": "string", "headline": "string",
  "seniority_apparent": "string", "domain_alignment": "string",
  "skills_matched": ["string"], "skills_gap": ["string"],
  "category_scores": {{
    "competency_name": {{"awarded": 20, "max": 25, "evidence": "string", "strength": "Strong|Moderate|Weak|Missing"}}
  }},
  "implicit_inferences": ["string"],
  "total_score": 75,
  "verdict": "Strong fit|Moderate fit|Weak fit|Reject",
  "shortlist_decision": "Yes|No|Borderline",
  "biggest_strength": "string", "biggest_risk": "string",
  "confidence": "High|Medium|Low",
  "top_interview_question": "string",
  "gaps_critical": ["string"], "gaps_trainable": ["string"]
}}
"""

QUESTIONNAIRE_PROMPT = """
Senior hiring manager generating targeted candidate questionnaire based on CV evaluation.
Questions must be role-specific, never generic. Assume omission not incompetence.

Job Analysis: {analysis}
CV Evaluation: {evaluation}

Respond ONLY with JSON:
{{
  "sections": [
    {{"title": "1. Role-Relevant Experience", "questions": ["q1", "q2"]}},
    {{"title": "2. Depth & Proficiency", "questions": ["q1", "q2"]}},
    {{"title": "3. Adjacent Experience", "questions": ["q1", "q2"]}},
    {{"title": "4. Seniority & Influence", "questions": ["q1", "q2"]}},
    {{"title": "5. Ownership & Impact", "questions": ["q1", "q2"]}}
  ]
}}
"""


async def analyse_jd(jd_text: str, provider: str | None = None) -> dict:
    if not jd_text or not jd_text.strip():
        raise ValueError("JD text is empty")
    raw = await call_llm(ANALYSE_PROMPT.format(jd_text=jd_text.strip()), provider=provider, system=SYSTEM, max_tokens=4096)
    result = extract_json(raw)
    if not result.get("role_objective") or not result.get("primary_competencies"):
        raise ValueError("LLM returned incomplete analysis")
    return result


async def evaluate_candidate(analysis: dict, profile: str, provider: str | None = None) -> dict:
    import json as _json
    raw = await call_llm(EVALUATE_PROMPT.format(analysis=_json.dumps(analysis), profile=profile), provider=provider, system=SYSTEM, max_tokens=3000)
    return extract_json(raw)


async def generate_questionnaire(analysis: dict, evaluation: dict, provider: str | None = None) -> dict:
    import json as _json
    raw = await call_llm(QUESTIONNAIRE_PROMPT.format(analysis=_json.dumps(analysis), evaluation=_json.dumps(evaluation)), provider=provider, system=SYSTEM, max_tokens=3000)
    return extract_json(raw)
