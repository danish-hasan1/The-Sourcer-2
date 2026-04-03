"""
Sourcing Service
Uses SerpAPI to search candidate profiles across platforms.
Extracts, structures, and evaluates each profile via the LLM pipeline.
"""
from __future__ import annotations
import asyncio
import httpx
from config import settings
from services.jd_service import evaluate_candidate

PLATFORM_SEARCH_TEMPLATES = {
    "linkedin":  'site:linkedin.com/in {boolean} "{location}"',
    "naukri":    'site:naukri.com {boolean} {location}',
    "github":    'site:github.com {boolean}',
    "indeed":    'site:indeed.com resume {boolean} {location}',
    "reed":      'site:reed.co.uk {boolean} {location}',
    "infojobs":  'site:infojobs.net {boolean} {location}',
    "monster":   'site:monster.com resume {boolean} {location}',
    "glassdoor": 'site:glassdoor.com resume {boolean} {location}',
}

PROFILE_EXTRACT_PROMPT = """
Extract structured candidate information from this search result snippet.
Return JSON only:
{{
  "name": "string or null",
  "headline": "string",
  "company": "string",
  "location": "string",
  "skills_mentioned": ["string"],
  "experience_years": "string",
  "profile_summary": "string"
}}

Snippet:
{snippet}
"""


async def search_platform(platform: str, boolean_query: str, location: str, max_results: int, serp_key: str) -> list[dict]:
    """Execute a SerpAPI search for a given platform and return raw results."""
    template = PLATFORM_SEARCH_TEMPLATES.get(platform, 'site:{platform}.com {boolean}')
    query = template.format(boolean=boolean_query, location=location, platform=platform)

    params = {
        "q": query,
        "num": min(max_results, 10),
        "api_key": serp_key,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.get("https://serpapi.com/search", params=params)
        res.raise_for_status()
        data = res.json()

    results = []
    for item in data.get("organic_results", []):
        results.append({
            "url":      item.get("link", ""),
            "title":    item.get("title", ""),
            "snippet":  item.get("snippet", ""),
            "source":   platform,
        })
    return results


async def extract_profile_from_snippet(snippet_data: dict, provider: str | None = None) -> dict:
    """Use LLM to extract structured profile data from a search snippet."""
    from services.llm_service import call_llm, extract_json
    prompt = PROFILE_EXTRACT_PROMPT.format(snippet=f"{snippet_data['title']}\n{snippet_data['snippet']}")
    try:
        raw = await call_llm(prompt, provider=provider, max_tokens=600)
        extracted = extract_json(raw)
        extracted["profile_url"] = snippet_data.get("url", "")
        extracted["source"] = snippet_data.get("source", "")
        extracted["raw_snippet"] = snippet_data.get("snippet", "")
        return extracted
    except Exception:
        return {
            "name": snippet_data.get("title", "Unknown").split(" - ")[0].split("|")[0].strip(),
            "headline": snippet_data.get("title", ""),
            "company": "",
            "location": "",
            "skills_mentioned": [],
            "experience_years": "",
            "profile_summary": snippet_data.get("snippet", ""),
            "profile_url": snippet_data.get("url", ""),
            "source": snippet_data.get("source", ""),
            "raw_snippet": snippet_data.get("snippet", ""),
        }


async def run_sourcing(
    job_id: int,
    analysis: dict,
    platforms: list[str],
    max_candidates: int,
    serp_key: str,
    provider: str | None,
    on_progress,   # async callback(step: str, pct: int, candidate: dict | None)
) -> list[dict]:
    """
    Full sourcing pipeline:
    1. Build search query from analysis
    2. Search each platform via SerpAPI
    3. Extract profile from each result
    4. Evaluate each profile against the scoring matrix
    5. Return ranked candidates
    """
    await on_progress("Building search queries from JD analysis", 10, None)

    boolean = analysis.get("boolean_strings", {}).get("primary", "")
    location = analysis.get("location", "").strip()

    # Fallback: if boolean string is empty or suspiciously short, build one from suggested titles
    if not boolean or len(boolean) < 10:
        titles = analysis.get("suggested_titles", [])
        role_obj = analysis.get("role_objective", "")
        if titles:
            boolean = " OR ".join(f'"{t}"' for t in titles[:3])
        elif role_obj:
            boolean = f'"{role_obj[:80]}"'

    # ── Step 1: Collect raw results from all platforms ──────────────────────
    await on_progress(f"Searching {len(platforms)} platform(s) via SerpAPI", 20, None)
    all_snippets: list[dict] = []

    if serp_key:
        tasks = [
            search_platform(p, boolean, location, max_candidates // len(platforms) + 1, serp_key)
            for p in platforms
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for r in results:
            if isinstance(r, list):
                all_snippets.extend(r)
    else:
        # No SerpAPI key — return empty (frontend shows demo data)
        await on_progress("No SerpAPI key configured — using demo mode", 90, None)
        await on_progress("Complete", 100, None)
        return []

    await on_progress(f"Found {len(all_snippets)} raw results — parsing profiles", 45, None)

    # ── Step 2: Deduplicate by URL ───────────────────────────────────────────
    seen_urls: set[str] = set()
    unique: list[dict] = []
    for s in all_snippets:
        if s["url"] not in seen_urls:
            seen_urls.add(s["url"])
            unique.append(s)

    unique = unique[:max_candidates]

    # ── Step 3: Extract profile data concurrently ────────────────────────────
    profiles = await asyncio.gather(*[extract_profile_from_snippet(s, provider) for s in unique])

    await on_progress(f"Evaluating {len(profiles)} candidates against scoring matrix", 65, None)

    # ── Step 4: Evaluate each profile ───────────────────────────────────────
    evaluated: list[dict] = []
    for i, profile in enumerate(profiles):
        pct = 65 + int((i / len(profiles)) * 25)
        profile_text = (
            f"Name: {profile.get('name','')}\n"
            f"Headline: {profile.get('headline','')}\n"
            f"Company: {profile.get('company','')}\n"
            f"Location: {profile.get('location','')}\n"
            f"Skills: {', '.join(profile.get('skills_mentioned',[]))}\n"
            f"Experience: {profile.get('experience_years','')}\n"
            f"Summary: {profile.get('profile_summary','')}\n"
            f"Profile URL: {profile.get('profile_url','')}"
        )
        try:
            evaluation = await evaluate_candidate(analysis, profile_text, provider)
        except Exception as e:
            evaluation = {
                "name": profile.get("name", "Unknown"),
                "total_score": 0,
                "verdict": "Weak fit",
                "shortlist_decision": "No",
            }

        candidate = {**profile, "evaluation": evaluation, "score": evaluation.get("total_score", 0), "verdict": evaluation.get("verdict", "Unknown")}
        evaluated.append(candidate)
        await on_progress(f"Evaluated {i+1}/{len(profiles)} candidates", pct, candidate)

    # ── Step 5: Sort by score ─────────────────────────────────────────────────
    evaluated.sort(key=lambda x: x["score"], reverse=True)
    await on_progress("Ranking complete", 100, None)
    return evaluated
