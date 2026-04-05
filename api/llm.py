import json
import re
from config import settings


async def call_llm(prompt: str, provider: str | None = None, system: str = "", max_tokens: int = 4096) -> str:
    p = provider or settings.DEFAULT_LLM_PROVIDER
    if p == "groq":      return await _groq(prompt, system, max_tokens)
    if p == "anthropic": return await _anthropic(prompt, system, max_tokens)
    if p == "openai":    return await _openai(prompt, system, max_tokens)
    if p == "google":    return await _google(prompt, system, max_tokens)
    return await _groq(prompt, system, max_tokens)  # default


async def _groq(prompt, system, max_tokens):
    from groq import AsyncGroq
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    res = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system or "You are a senior recruitment AI. Respond with valid JSON only."},
            {"role": "user",   "content": prompt},
        ],
    )
    return res.choices[0].message.content


async def _anthropic(prompt, system, max_tokens):
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    msg = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=max_tokens,
        system=system or "You are a senior recruitment AI. Respond with valid JSON only.",
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


async def _openai(prompt, system, max_tokens):
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    res = await client.chat.completions.create(
        model="gpt-4o",
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system or "You are a senior recruitment AI. Respond with valid JSON only."},
            {"role": "user",   "content": prompt},
        ],
    )
    return res.choices[0].message.content


async def _google(prompt, system, max_tokens):
    import google.generativeai as genai
    genai.configure(api_key=settings.GOOGLE_API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")
    res = await model.generate_content_async(f"{system}\n\n{prompt}" if system else prompt)
    return res.text


def extract_json(text: str) -> dict | list:
    clean = re.sub(r"```(?:json)?", "", text).replace("```", "").strip()
    # Find the first { or [ to handle any preamble
    start = next((i for i, c in enumerate(clean) if c in "{["), 0)
    return json.loads(clean[start:])
