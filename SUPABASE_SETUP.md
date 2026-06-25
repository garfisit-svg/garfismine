# 🚀 Turning GARF into a Real-Time Production Site with Supabase & Vercel

This guide outlines the **simplest, fastest, and most cost-effective** way to migrate your local-state application to a production-grade backend with **real-time chat, slot holds, and booking sync** using **Supabase** (Database, Auth, and Realtime Engine) and **Vercel** (Hosting).

---

## 📅 Part 1: Setting up Supabase (Takes 3 Minutes)

Supabase gives you a PostgreSQL database with a real-time listening socket out of the box.

1. **Create an Account & Project**:
   * Go to [supabase.com](https://supabase.com) and sign up for a free account.
   * Click **New Project** and select a region closest to your target audience.
   * Save your **Database Password** safely.

2. **Run the SQL Schema Script**:
   * Once your project is ready, click on **SQL Editor** from the left navigation rail in Supabase.
   * Click **New Query**.
   * Open the file `/SUPABASE_SCHEMA.sql` located at the root of this project.
   * Copy the entire code block and paste it into the editor.
   * Click **Run** ➔ Your tables, relationships, performance indexes, and real-time triggers are instantly created!

3. **Get Your API Credentials**:
   * Navigate to **Project Settings** ➔ **API**.
   * Copy your **Project URL** (e.g. `https://xxx.supabase.co`).
   * Copy your **Anon/Public Key** (e.g. `eyJhbG...`).

---

## ⚡ Part 2: Connect the App locally

Before deploying to production, test the connection locally:

1. Create a `.env` file at your project root if you haven't already.
2. Add the copied credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
3. The app is already equipped with `@supabase/supabase-js` (fully installed) and handles fallback gracefully.

---

## 🌍 Part 3: Deploying on Vercel (Takes 2 Minutes)

Vercel is the premier platform for hosting React-Vite websites for free, with instant deployments.

1. **Push your code to GitHub**:
   * Initialize a git repo and push it to your GitHub account (private or public).

2. **Import to Vercel**:
   * Go to [vercel.com](https://vercel.com) and sign up/login.
   * Click **Add New** ➔ **Project**.
   * Import your GitHub repository.

3. **Configure Environment Variables**:
   * In the Vercel setup panel, expand **Environment Variables**.
   * Add the following two key-value pairs:
     * `VITE_SUPABASE_URL` ➔ `[Your URL]`
     * `VITE_SUPABASE_ANON_KEY` ➔ `[Your Anon Key]`
   * Click **Deploy**!

Vercel will build the React SPA and serve it over a lightning-fast CDN with free HTTPS.

---

## 🛠️ Part 4: Connecting local state to Supabase

To make the existing state read from Supabase directly in `/src/context/AppContext.tsx`:

### 1. Fetching on App Launch
Update the `useEffect` block inside your `AppContext.tsx` to read values from Supabase tables:
```typescript
import { supabase } from '../lib/supabase';

useEffect(() => {
  const loadSupabaseData = async () => {
    if (!supabase) return;
    
    // Fetch profiles
    const { data: profileList } = await supabase.from('profiles').select('*');
    if (profileList) setProfiles(profileList);

    // Fetch live bookings
    const { data: bookingList } = await supabase.from('bookings').select('*');
    if (bookingList) setBookings(bookingList);
  };
  
  loadSupabaseData();
}, []);
```

### 2. Inserting items
Whenever a write operation happens (like registering a venue or booking a slot), perform the insert query:
```typescript
const registerVenue = async (venueData) => {
  if (supabase) {
    await supabase.from('venues').insert([venueData]);
  }
};
```

### 3. Real-Time Chat messages
Listen to incoming messages live and insert them seamlessly:
```typescript
import { SupabaseSyncService } from '../lib/supabaseSync';

useEffect(() => {
  const subscription = SupabaseSyncService.subscribeToMessages((newMessage) => {
    // Add live messages straight to react state instantly!
    setMessages(prev => [...prev, newMessage]);
  });

  return () => {
    subscription?.unsubscribe();
  };
}, []);
```

---

## 🎉 Benefits of this Setup
* **Zero Cost**: Supabase and Vercel both offer generous free tiers.
* **Instant Scalability**: Handles hundreds of concurrent users without breaking.
* **True Real-time**: WebSockets are handled by Supabase channels for live chat and booking update notifications.
