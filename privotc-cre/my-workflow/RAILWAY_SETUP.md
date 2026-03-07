# Railway Deployment Guide for CRE Matching

## Quick Setup (5 minutes)

### Step 1: Push to GitHub
```powershell
cd c:\Users\thame\chain.link
git add .
git commit -m "feat: Railway deployment for CRE matching"
git push
```

### Step 2: Deploy to Railway

1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose: `theyuvan/chain.link`
5. Click **"Add variables"** and set:
   - `CRE_ETH_PRIVATE_KEY` = `0xf64b45c2063ab73b67ec0e34f24eede3a80d8e3b0a755e318d598a746c38827c`
6. In Settings → Change:
   - **Root Directory**: `privotc-cre/my-workflow`
   - **Watch Paths**: `/privotc-cre/my-workflow/**`

### Step 3: Handle CRE Authentication

**⚠️ IMPORTANT**: Railway will have the same authentication issue as GitHub Actions.

**Two Options:**

#### Option A: Use a CRE API Token (if available)
If CRE supports service account tokens:
1. Generate token in CRE dashboard
2. Add as Railway environment variable: `CRE_API_TOKEN`
3. Update Dockerfile to authenticate with token

#### Option B: Manual Trigger (Recommended for Demo)
Use the local PowerShell script since you're already logged in:
```powershell
# Run this on your local machine before demo
.\RUN_CRE_MATCHING.ps1
```

### Step 4: Monitor Logs

In Railway dashboard:
- Click your service
- Go to **"Deployments"** tab  
- View real-time logs to see matching happen

### Cost
- **Free**: $5/month credit (plenty for this)
- Your app will use ~$0.50/month

---

## Alternative: Keep It Simple for Demo

Since your demo is **tomorrow (March 8)**, the **fastest solution** is:

```powershell
# Before recording your demo video:
cd c:\Users\thame\chain.link\privotc-cre\my-workflow

# Submit 2 matching trades on frontend
# Then run:
cre workflow simulate --trigger-index 2

# Show the match in your frontend
# Film this for your demo! ✅
```

**Why this is best:**
- ✅ Already working locally
- ✅ No deployment issues
- ✅ No auth problems
- ✅ Clean demo flow

You can deploy to Railway **after** the hackathon when you have more time to debug authentication.
