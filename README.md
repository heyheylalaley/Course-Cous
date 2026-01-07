# Course Counselor AI

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

AI-powered course counselor with chat support, course registration, and admin panel. Built with React 19, TypeScript, Vite, Tailwind CSS, and Supabase.

## ✨ Key Features

- 🤖 **AI Assistant** powered by Google Gemini 2.0 Flash with streaming responses
- 📚 **Course Management** with real-time updates via Supabase
- 📝 **Registration** for up to 3 courses with priority management
- 👤 **User Profiles** with English level tracking (A1-C2)
- 🌍 **4 Languages**: English, Українська, Русский, العربية (RTL support)
- 🌙 **Dark Mode** with localStorage persistence
- 🔐 **Authentication** via Supabase (Email/Password, Google OAuth)
- 👨‍💼 **Admin Panel**: analytics, course management, bot instructions, external links

## 🤖 AI Bot Features

- **Context-aware**: Remembers user's English level throughout conversation
- **Multi-language**: Automatically responds in user's language (RU, UA, AR, EN)
- **Smart recommendations**: Suggests courses based on user's level and interests
- **External resources**: Links to ETB, JobsIreland, Indeed, Citizens Info, etc.
- **Friendly personality**: Can joke and chat while helping find courses

### Bot Configuration (Admin Panel)

Configure bot behavior through three sections:

| Section | Purpose |
|---------|---------|
| **Main Instructions** | Core behavior, personality, language rules |
| **Contact Information** | Staff contacts (shared only when asked) |
| **External Links** | Resources for jobs, English courses, housing, etc. |

**Available placeholders:**
- `{{COURSES_LIST}}` — Active courses list
- `{{USER_ENGLISH_LEVEL}}` — User's English level (None, A1-C2)
- `{{CONTACTS}}` — Contact information
- `{{EXTERNAL_LINKS}}` — External resources

## 🛠️ Tech Stack

| Frontend | Backend | AI | Deployment |
|----------|---------|-----|------------|
| React 19 | Supabase (PostgreSQL + Auth) | Google Gemini 2.0 Flash | GitHub Pages |
| TypeScript | Supabase Realtime | Context injection | GitHub Actions |
| Vite | Google Translate API | Streaming responses | |
| Tailwind CSS 3.4 | | | |

## 📁 Project Structure

```
├── components/          # React components
│   ├── Admin*.tsx      # Admin panel components
│   ├── Chat*.tsx       # Chat interface
│   ├── Course*.tsx     # Course cards
│   ├── Dashboard.tsx   # User dashboard
│   └── Skeletons.tsx   # Skeleton loaders
├── contexts/           # React Context (Auth, Courses, UI)
├── hooks/              # Custom hooks (useCourses, useDebounce)
├── services/           # API services
│   ├── db.ts          # Supabase database operations
│   ├── geminiService.ts # AI chat with context injection
│   └── translateService.ts # Google Translate
├── translations.ts     # UI translations (4 languages)
└── types.ts           # TypeScript types
```

## 🚀 Quick Start

### 1. Clone

```bash
git clone https://github.com/heyheylalaley/Course-Cous.git
cd Course-Cous
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create `.env.local`:

```env
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GOOGLE_TRANSLATE_API_KEY=your-translate-api-key  # optional
```

### 4. Database Setup

1. Create a project at [Supabase](https://supabase.com)
2. Run SQL from `supabase-complete-schema.sql`
3. Details: [SUPABASE-SETUP.md](SUPABASE-SETUP.md)

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000

## 🔧 Performance Optimizations

- **Tailwind CSS Build** instead of CDN (~300KB → ~15KB)
- **React Context** for state management (AuthContext, CoursesContext, UIContext)
- **Lazy Loading** components (AdminDashboard, ChatInterface, Dashboard)
- **React.memo** to prevent unnecessary re-renders
- **Supabase Realtime** instead of polling
- **Skeleton Loaders** for improved perceived performance
- **useDebounce** for course search
- **Optimistic Updates** for registrations
- **Gemini Session Caching** with context injection for better memory

## 📝 Scripts

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## 🚀 Deploy to GitHub Pages

Deployment is automatic via GitHub Actions on push to `main`.

### Required Secrets (Settings → Secrets):

- `VITE_GEMINI_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_TRANSLATE_API_KEY` (optional)

## 📖 Documentation

- [SUPABASE-SETUP.md](SUPABASE-SETUP.md) - Database setup guide
- [GOOGLE-TRANSLATE-SETUP.md](GOOGLE-TRANSLATE-SETUP.md) - Translation setup guide

## 📄 License

Proprietary project.

---

Made with ❤️ by Cork City Partnership
