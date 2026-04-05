from llm import call_llm, extract_json

SYSTEM = (
    "You are a senior recruitment intelligence AI. "
    "Analyse the EXACT job description provided — do NOT use templates or defaults. "
    "Respond with valid JSON only — no preamble, no markdown fences."
)

ANALYSE_PROMPT = """
You are the original hiring decision-maker who authored this JD, combined with a senior talent evaluator.

CRITICAL: Analyse THIS EXACT job description. Do NOT default to any generic role type.
Weights must total EXACTLY 100.

Job Description:
===START===
{jd_text}
===END===

Respond ONLY with JSON:
{{
  "role_objective": "string",
  "seniority": "string",
  "ownership": "string",
  "primary_competencies": [
    {{"name": "string", "weight": 25, "why": "string"}}
  ],
  "secondary_competencies": [
    {{"name": "string", "weight": 10}}
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
  "suggested_titles": ["string"],
  "suggested_platforms": ["linkedin", "naukri", "indeed", "github"]
}}
"""

EVALUATE_PROMPT = """
Senior recruiter evaluating a candidate against a specific role's scoring matrix.

Job Analysis:
{analysis}

Candidate Profile:
{profile}

Respond ONLY with JSON:
{{
  "name": "string", "headline": "string",
  "skills_matched": ["string"], "skills_gap": ["string"],
  "total_score": 75,
  "verdict": "Strong fit|Moderate fit|Weak fit|Reject",
  "shortlist_decision": "Yes|No|Borderline",
  "biggest_strength": "string",
  "biggest_risk": "string",
  "top_interview_question": "string",
  "gaps_critical": ["string"],
  "gaps_trainable": ["string"]
}}
"""

QUESTIONNAIRE_PROMPT = """
Generate a targeted CV enrichment questionnaire for this candidate.
Be role-specific. Assume omission not incompetence.

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

OUTREACH_PROMPT = """
Write 3 personalised LinkedIn outreach messages for this candidate.
Each under 300 characters, specific, professional but warm.

Role: {role_title}
Candidate: {name}, {headline}, {company}
Strength: {strength}

Respond ONLY with JSON:
{{
  "messages": [
    {{"tone": "Professional", "text": "string"}},
    {{"tone": "Warm & direct", "text": "string"}},
    {{"tone": "Role-specific", "text": "string"}}
  ],
  "subject_line": "string"
}}
"""


def analyse_jd(jd_text: str, provider: str = None) -> dict:
    if not jd_text.strip():
        raise ValueError("JD text is empty")
    raw = call_llm(ANALYSE_PROMPT.format(jd_text=jd_text.strip()),
                   provider=provider, system=SYSTEM, max_tokens=4096)
    result = extract_json(raw)
    if not result.get("role_objective"):
        raise ValueError("Analysis returned incomplete result")
    return result


def evaluate_candidate(analysis: dict, profile: str, provider: str = None) -> dict:
    import json as _json
    raw = call_llm(EVALUATE_PROMPT.format(
        analysis=_json.dumps(analysis, indent=2),
        profile=profile,
    ), provider=provider, system=SYSTEM, max_tokens=2000)
    return extract_json(raw)


def generate_questionnaire(analysis: dict, evaluation: dict, provider: str = None) -> dict:
    import json as _json
    raw = call_llm(QUESTIONNAIRE_PROMPT.format(
        analysis=_json.dumps(analysis),
        evaluation=_json.dumps(evaluation),
    ), provider=provider, system=SYSTEM, max_tokens=2000)
    return extract_json(raw)


def generate_outreach(role_title: str, name: str, headline: str, company: str, strength: str, provider: str = None) -> dict:
    raw = call_llm(OUTREACH_PROMPT.format(
        role_title=role_title, name=name, headline=headline,
        company=company, strength=strength,
    ), system="Respond with valid JSON only.", max_tokens=800)
    return extract_json(raw)
