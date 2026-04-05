#!/bin/bash
# Run this script from inside the talentai/ folder to push everything to GitHub

echo "=== TalentAI — Push to GitHub ==="
echo ""

# Check we're in the right place
if [ ! -f "vercel.json" ]; then
  echo "ERROR: Run this from inside the talentai/ folder"
  exit 1
fi

# Stage everything
git add -A

# Show what's changed
echo "Files changed:"
git diff --cached --name-only
echo ""

# Commit
git commit -m "v7: Move backend to Vercel serverless, remove Render dependency"

# Push
git push origin main

echo ""
echo "Done! Vercel will auto-deploy in ~30 seconds."
echo "Check: https://vercel.com/dashboard"
