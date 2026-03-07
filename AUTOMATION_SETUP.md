# CRE Auto-Matching Setup Guide

## 🎯 **Goal: Automatically match trades without manual intervention**

You have 3 options, ranked from best to "works now":

---

## ✅ **Option 1: Deploy Correct CRE Workflow (BEST - Need Approval)**

**Status**: ⏳ Waiting for deployment access email

**How it works**:
- CRE runs on **Chainlink DON** (their infrastructure)
- Fetches from Vercel **every 15 seconds** automatically
- Matches trades **every 30 seconds** automatically
- Runs in **TEE/SGX** (real privacy!)
- **FREE** (included in Chainlink service)
- **NO server costs**

**Setup**:
```powershell
# Once you get approval email:
cd c:\Users\thame\chain.link\privotc-cre\my-workflow
cre workflow deploy . --project-root . --target privotc-staging
```

**Then activate it**:
```powershell
cre workflow activate <CONTRACT_ADDRESS> --target privotc-staging
```

**Done!** It runs forever, automatically. 🎉

---

## ✅ **Option 2: GitHub Actions (Works NOW - FREE)**

**Status**: ✅ Can deploy immediately

**How it works**:
- GitHub runs your workflow **every 2 minutes**
- Free tier: 2000 minutes/month (enough for ~16 hours/day)
- No server needed
- Automated via cron schedule

**Setup**:

1. **Add secrets to GitHub**:
   - Go to: https://github.com/theyuvan/chain.link/settings/secrets/actions
   - Add:
     - `CRE_ETH_PRIVATE_KEY` = `0xf64b45c2063ab73b67ec0e34f24eede3a80d8e3b0a755e318d598a746c38827c`
     - `CRE_AUTH_TOKEN` = (Get from `~/.cre/auth.json` after running `cre login`)

2. **Push the workflow file**:
   ```powershell
   cd c:\Users\thame\chain.link
   git add .github/workflows/cre-matching.yml
   git commit -m "Add automated CRE matching via GitHub Actions"
   git push
   ```

3. **Enable Actions**:
   - Go to: https://github.com/theyuvan/chain.link/actions
   - Click "I understand my workflows, go ahead and enable them"

4. **Test manually**:
   - Go to Actions → CRE Auto Matching → Run workflow

**Done!** Runs every 2 minutes automatically.

**Pros**:
- ✅ FREE (2000 min/month)
- ✅ No server setup
- ✅ Git-based deployment
- ✅ Logs visible in GitHub

**Cons**:
- ❌ 2-minute intervals minimum (not 15 seconds like CRE DON)
- ❌ Limited to 2000 minutes/month

---

## ✅ **Option 3: Railway.app (Works NOW - $5/month)**

**Status**: ✅ Can deploy immediately

**How it works**:
- Railway hosts a container running CRE CLI
- Runs matching **every 30 seconds** 24/7
- $5/month for hobby plan
- One-click deploy

**Setup**:

1. **Sign up**: https://railway.app/

2. **Create new project** → Deploy from GitHub

3. **Connect repo**: `theyuvan/chain.link`

4. **Set root directory**: `privotc-cre/my-workflow`

5. **Add environment variable**:
   - `CRE_ETH_PRIVATE_KEY` = `0xf64b45c2063ab73b67ec0e34f24eede3a80d8e3b0a755e318d598a746c38827c`

6. **Deploy**

**Done!** Runs 24/7 automatically.

**Pros**:
- ✅ Runs 24/7
- ✅ 30-second intervals
- ✅ Easy setup
- ✅ Good logs

**Cons**:
- ❌ Costs $5/month
- ❌ Still not as fast as CRE DON (15s)

---

## ✅ **Option 4: Render.com (Works NOW - FREE/Paid)**

**Status**: ✅ Can deploy immediately

**Setup**:

1. **Sign up**: https://render.com/

2. **New Web Service** → Connect GitHub repo

3. **Use `render.yaml`** (already created)

4. **Add environment variable**:
   - `CRE_ETH_PRIVATE_KEY`

5. **Deploy**

**Free tier**:
- ⚠️ Spins down after 15 min inactivity
- ⚠️ Startup takes ~1 minute

**Paid tier** ($7/month):
- ✅ Always on
- ✅ No spin down

---

## 📊 **Comparison Table**

| Option | Cost | Speed | Setup | Best For |
|--------|------|-------|-------|----------|
| **CRE DON** | FREE | 15s | Need approval | Production ⭐ |
| **GitHub Actions** | FREE | 2min | 5 min | Testing now ✅ |
| **Railway** | $5/mo | 30s | 10 min | Demo/Hackathon |
| **Render** | $7/mo | 30s | 10 min | Alternative |

---

## 🎯 **Recommendation**

**TODAY (March 7)**:
1. ✅ Use **GitHub Actions** (FREE, works now)
2. ⏳ Wait for CRE deployment approval email

**AFTER getting approval**:
1. ✅ Deploy correct CRE workflow to DON
2. ❌ Disable GitHub Actions (save minutes)
3. 🎉 Use CRE DON forever (FREE, 15s intervals, TEE/SGX)

---

## 🚀 **Quick Start: GitHub Actions (Recommended for NOW)**

```powershell
# 1. Get CRE auth token
Get-Content ~/.cre/auth.json

# 2. Copy the entire JSON content

# 3. Go to GitHub secrets:
#    https://github.com/theyuvan/chain.link/settings/secrets/actions

# 4. Add two secrets:
#    - CRE_ETH_PRIVATE_KEY
#    - CRE_AUTH_TOKEN (paste the JSON)

# 5. Push workflow file
cd c:\Users\thame\chain.link
git add .github/workflows/cre-matching.yml
git commit -m "feat: automated CRE matching"
git push

# 6. Enable GitHub Actions in repo settings

# 7. Test: GitHub → Actions → Run workflow manually
```

**Done!** Auto-matching every 2 minutes. 🎉

---

## 📝 **Notes**

- **GitHub Actions** is perfect for hackathon demo (FREE, simple)
- **CRE DON deployment** is ultimate goal (faster, TEE, free)
- You're currently blocked waiting for deployment access
- Use GitHub Actions as temporary solution

**Deadline**: March 8 (tomorrow!)  
**Action**: Set up GitHub Actions TODAY so matching works automatically for your demo video!
