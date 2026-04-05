import json
import re
import config


def call_llm(prompt: str, provider: str = None, system: str = "", max_tokens: int = 4096) -> str:
    p = provider or config.DEFAULT_LLM
    if p == "groq":      return _groq(prompt, system, max_tokens)
    if p == "anthropic": return _anthropic(prompt, system, max_tokens)
    if p == "openai":    return _openai(prompt, system, max_tokens)
    if p == "google":    return _google(prompt, system, max_tokens)
    return _groq(prompt, system, max_tokens)


def _groq(prompt, system, max_tokens):
    from groq import Groq
    client = Groq(api_key=config.GROQ_API_KEY)
    res = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system or "You are a senior recruitment AI. Respond with valid JSON only."},
            {"role": "user",   "content": prompt},
        ],
    )
    return res.choices[0].message.content


def _anthropic(prompt, system, max_tokens):
    import anthropic
    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=max_tokens,
        system=system or "You are a senior recruitment AI. Respond with valid JSON only.",
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


def _openai(prompt, system, max_tokens):
    from openai import OpenAI
    client = OpenAI(api_key=config.OPENAI_API_KEY)
    res = client.chat.completions.create(
        model="gpt-4o",
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system or "You are a senior recruitment AI. Respond with valid JSON only."},
            {"role": "user",   "content": prompt},
        ],
    )
    return res.choices[0].message.content


def _google(prompt, system, max_tokens):
    import google.generativeai as genai
    genai.configure(api_key=config.GOOGLE_API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")
    res = model.generate_content(f"{system}\n\n{prompt}" if system else prompt)
    return res.text


def extract_json(text: str) -> dict | list:
    clean = re.sub(r"```(?:json)?", "", text).replace("```", "").strip()
    start = next((i for i, c in enumerate(clean) if c in "{["), 0)
    return json.loads(clean[start:])
