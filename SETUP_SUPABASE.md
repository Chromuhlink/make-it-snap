# Supabase Setup Instructions

Your app is configured to use Supabase for image storage, but the environment variables are missing.

## Issue Found
The `.env.local` file is missing the required Supabase configuration:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## To Fix This:

### Step 1: Get Your Supabase Credentials
1. Go to [https://supabase.com](https://supabase.com) and sign in (or create an account)
2. Create a new project or use an existing one
3. Go to **Settings > API** in your project dashboard
4. Copy your **Project URL** (looks like: `https://xxxxx.supabase.co`)
5. Copy your **anon/public** key (a long string starting with `eyJ...`)

### Step 2: Create Storage Bucket
1. In your Supabase dashboard, go to **Storage**
2. Click **New bucket**
3. Name it exactly: `photos`
4. **IMPORTANT**: Toggle **"Public bucket"** to ON (green)
5. Click **Create**

### Step 3: Set Storage Policies (Required for Upload/View)
1. After creating the bucket, click on it
2. Go to the **Policies** tab
3. Click **New Policy** and create these policies:

**Policy 1: Allow anonymous uploads**
- Policy name: `Allow anonymous uploads`
- Target roles: Check `anon`
- Operations: Check `INSERT`
- Click **Save**

**Policy 2: Allow public viewing**
- Policy name: `Allow public viewing`
- Target roles: Check `anon`
- Operations: Check `SELECT`
- Click **Save**

### Step 4: Add to .env.local
Add these lines to your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Replace the values with your actual credentials from Step 1.

### Step 5: Test the Connection
After adding the credentials, run:
```bash
node test-supabase.js
```

This will verify:
- Environment variables are set correctly
- The photos bucket exists and is public
- Upload functionality works
- Gallery can retrieve photos

## Alternative: Use Local Storage (No Supabase)
If you don't want to use Supabase, we can switch back to Vercel Blob storage or implement local file storage for development.