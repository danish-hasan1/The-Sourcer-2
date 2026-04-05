# Vercel Dashboard Settings — DO THIS NOW

Go to: vercel.com → the-sourcer-2 → Settings → General

## 1. Framework Preset
Change from: Vite
Change to:   Other
Click Save.

## 2. Build and Deployment  
Go to: Settings → Build and Deployment

Set ALL of these (enable Override toggle for each):
- Build Command:    cd frontend && npm install && npm run build
- Output Directory: frontend/dist
- Install Command:  cd frontend && npm install
- Root Directory:   (leave COMPLETELY blank — delete the ./ if there)

Click Save.

## 3. Redeploy
Go to: Deployments → (latest) → ... menu → Redeploy

## Verify it worked
After deploy, visit: https://the-sourcer-2.vercel.app/api/health
You should see: {"status":"ok","db":true}

If you see that, login will work immediately.
