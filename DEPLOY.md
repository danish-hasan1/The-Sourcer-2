# TalentAI — Streamlit Cloud Deployment

## Deploy in 2 minutes

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "TalentAI Streamlit"
git remote add origin https://github.com/YOUR_USERNAME/talentai-streamlit.git
git push -u origin main
```

### 2. Deploy on Streamlit Cloud (free)
1. Go to share.streamlit.io
2. Click "New app"
3. Select your GitHub repo
4. Main file path: `app.py`
5. Click "Advanced settings" → paste secrets (below)
6. Click Deploy

### 3. Add secrets
In Streamlit Cloud → your app → Settings → Secrets, paste:

```toml
DATABASE_URL = "postgresql+psycopg2://postgres.rjooprjzwjyrlawwccla:dfNgJvBTSulnBmzD@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"
SECRET_KEY   = "talentai-stable-jwt-secret-2026"
GROQ_API_KEY = "sk_LvIgHlvwmXLGi92k5f17WGdyb3FYA0pp5i1RqBhSFrhrEkA2n1db"
SERPAPI_KEY  = "9400c016f4ced8e2b0b66ba43a2f7092d490c3a25a3a33c1c2f2f6903fc25c6c"
DEFAULT_LLM_PROVIDER = "groq"
MAX_CANDIDATES = "50"
```

### Demo credentials
- Admin: admin@talentai.com / demo123
- Recruiter: recruiter@talentai.com / demo123

### Local development
```bash
pip install -r requirements.txt
cp .streamlit/secrets.toml.example .streamlit/secrets.toml
# edit .streamlit/secrets.toml with your keys
streamlit run app.py
```
