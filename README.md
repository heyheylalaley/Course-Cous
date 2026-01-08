# Course Counselor AI

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.0_Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)

**AI-powered course counselor for Cork City Partnership with intelligent chat support, course registration system, and comprehensive admin panel.**

[Live Demo](https://heyheylalaley.github.io/Course-Cous/) • [Report Bug](https://github.com/heyheylalaley/Course-Cous/issues) • [Request Feature](https://github.com/heyheylalaley/Course-Cous/issues)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [AI Bot Configuration](#-ai-bot-configuration)
- [Admin Panel](#-admin-panel)
- [User Flow](#-user-flow)
- [Performance Optimizations](#-performance-optimizations)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

Course Counselor AI is a full-stack web application designed for Cork City Partnership to help users discover and register for educational courses. The application features an AI-powered chatbot that provides personalized course recommendations based on the user's English proficiency level and career interests.

### Key Highlights

- **Intelligent Recommendations**: AI suggests courses based on user's English level (None → C2)
- **Multi-language Support**: Full UI and AI responses in 4 languages with RTL support for Arabic
- **Real-time Updates**: Course availability and registrations update instantly via Supabase Realtime
- **Accessible Design**: Responsive UI optimized for mobile, tablet, and desktop

---

## ✨ Features

### 🤖 AI Chat Assistant

| Feature | Description |
|---------|-------------|
| **Streaming Responses** | Real-time text generation using Google Gemini 2.0 Flash |
| **Context Awareness** | Remembers user's English level and conversation history |
| **Language Detection** | Automatically responds in user's language (EN, RU, UA, AR) |
| **Course Recommendations** | Smart suggestions based on English level requirements |
| **External Resources** | Provides links to job sites, housing, English courses, etc. |
| **Clickable Course Names** | Bold course names in chat open registration modal |
| **External Links** | Links open in new tab with visual indicators |

### 📚 Course Management

- **Course Catalog**: Browse all available courses with filtering
- **Course Details**: View description, schedule, requirements, and availability
- **Real-time Availability**: See how many spots are left in each course
- **Priority Queue**: Position tracking when courses are full
- **Course Completion**: Track completed courses separately

### 👤 User Features

- **Profile Management**: Set name, phone number, and English level
- **Registration Limit**: Maximum 3 active course registrations
- **Registration Priority**: Automatic position assignment (1, 2, 3...)
- **Course History**: View completed courses
- **Language Preference**: Switch UI language anytime
- **Dark Mode**: Toggle with localStorage persistence

### 🔐 Authentication

- **Email/Password**: Traditional signup and login
- **Google OAuth**: One-click sign-in with Google
- **Session Persistence**: Stay logged in across browser sessions
- **Secure Tokens**: JWT-based authentication via Supabase

### 👨‍💼 Admin Panel

- **Dashboard Analytics**: Overview of users, registrations, and courses
- **Course Management**: Create, edit, delete, translate courses
- **Student Management**: View registrations, mark completions, remove students
- **Bot Instructions**: Configure AI personality and behavior
- **External Links**: Manage resource links the bot shares
- **User Management**: View all registered users and their profiles

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.3 | UI framework with latest features |
| TypeScript | 5.8 | Type safety and better DX |
| Vite | 6.2 | Fast bundling and HMR |
| Tailwind CSS | 3.4 | Utility-first styling |
| Lucide React | 0.562 | Beautiful icon library |
| React Markdown | 10.1 | Render AI responses with formatting |

### Backend & Services

| Technology | Purpose |
|------------|---------|
| Supabase | PostgreSQL database, Auth, Realtime subscriptions |
| Google Gemini 2.0 Flash | AI chat with streaming and context caching |
| Google Translate API | Optional course description translations |

### Deployment

| Platform | Purpose |
|----------|---------|
| GitHub Pages | Static site hosting |
| GitHub Actions | CI/CD pipeline for automatic deployments |

---

## 🏗️ Architecture

### Project Structure

```
├── components/                 # React components
│   ├── AdminAllUsers.tsx      # Admin: user list with profiles
│   ├── AdminAnalytics.tsx     # Admin: dashboard statistics
│   ├── AdminBotInstructions.tsx # Admin: AI configuration
│   ├── AdminCourseList.tsx    # Admin: course CRUD operations
│   ├── AdminCourseManagement.tsx # Admin: course translations
│   ├── AdminDashboard.tsx     # Admin: main dashboard layout
│   ├── AdminStudentList.tsx   # Admin: student management per course
│   ├── AlertModal.tsx         # Reusable alert/notification modal
│   ├── AuthScreen.tsx         # Login/signup forms
│   ├── ChatInterface.tsx      # AI chat with message history
│   ├── ConfirmationModal.tsx  # Reusable confirmation dialog
│   ├── ContactModal.tsx       # Contact information popup
│   ├── CourseCard.tsx         # Course display card component
│   ├── CourseDetailsModal.tsx # Course information modal
│   ├── CourseEditModal.tsx    # Admin: course editor
│   ├── Dashboard.tsx          # User dashboard with sidebar
│   ├── LanguageLevelModal.tsx # English level selection
│   ├── MessageBubble.tsx      # Chat message with markdown support
│   ├── NameModal.tsx          # Name input modal
│   ├── OnboardingModal.tsx    # First-time user setup
│   ├── ProfileInfoModal.tsx   # User profile editor
│   └── Skeletons.tsx          # Loading skeleton components
│
├── contexts/                   # React Context providers
│   ├── AuthContext.tsx        # Authentication state management
│   ├── CoursesContext.tsx     # Courses and registrations state
│   ├── UIContext.tsx          # UI state (theme, language, tabs)
│   └── index.ts               # Context exports
│
├── hooks/                      # Custom React hooks
│   ├── useCourses.ts          # Course data fetching hook
│   └── useDebounce.ts         # Input debouncing hook
│
├── services/                   # API and external services
│   ├── db.ts                  # Supabase database operations
│   ├── geminiService.ts       # Google Gemini AI integration
│   └── translateService.ts    # Google Translate API
│
├── App.tsx                     # Main app component with routing
├── index.tsx                   # React entry point
├── index.css                   # Global styles and Tailwind imports
├── types.ts                    # TypeScript type definitions
├── translations.ts             # UI strings in 4 languages
├── constants.ts                # App constants and defaults
│
├── supabase-complete-schema.sql # Database schema and RLS policies
├── SUPABASE-SETUP.md          # Database setup documentation
├── GOOGLE-TRANSLATE-SETUP.md  # Translation API documentation
│
├── vite.config.ts             # Vite configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ AuthScreen  │  │  Dashboard  │  │      AdminDashboard     │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      React Context Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ AuthContext │  │CoursesCtx   │  │       UIContext         │  │
│  │ (user,auth) │  │(courses,reg)│  │   (theme,lang,tabs)     │  │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────────┘  │
└─────────┼────────────────┼──────────────────────────────────────┘
          │                │
          ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Services Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │    db.ts    │  │geminiSvc.ts │  │    translateSvc.ts      │  │
│  │ (Supabase)  │  │  (Gemini)   │  │   (Google Translate)    │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Supabase   │  │   Google    │  │        Google           │  │
│  │ PostgreSQL  │  │   Gemini    │  │      Translate          │  │
│  │  + Auth     │  │  2.0 Flash  │  │         API             │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ or **yarn** 1.22+
- **Supabase** account (free tier available)
- **Google AI Studio** account for Gemini API key

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/heyheylalaley/Course-Cous.git
cd Course-Cous
```

2. **Install dependencies**

```bash
npm install
```

3. **Create environment file**

```bash
cp .env.example .env.local
# or create .env.local manually
```

4. **Configure environment variables** (see [Environment Variables](#-environment-variables))

5. **Set up database** (see [Database Setup](#-database-setup))

6. **Start development server**

```bash
npm run dev
```

7. **Open in browser**

Navigate to `http://localhost:3000`

---

## 🔑 Environment Variables

Create a `.env.local` file in the project root:

```env
# Required: Google Gemini AI
VITE_GEMINI_API_KEY=your-gemini-api-key

# Required: Supabase Database
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional: Google Translate (for course translations)
VITE_GOOGLE_TRANSLATE_API_KEY=your-translate-api-key
```

### How to Get API Keys

| Service | Steps |
|---------|-------|
| **Gemini API** | 1. Go to [Google AI Studio](https://aistudio.google.com/apikey) <br> 2. Click "Create API Key" <br> 3. Copy the key |
| **Supabase** | 1. Create project at [Supabase](https://supabase.com) <br> 2. Go to Settings → API <br> 3. Copy Project URL and `anon` public key |
| **Google Translate** | 1. Go to [Google Cloud Console](https://console.cloud.google.com) <br> 2. Enable Cloud Translation API <br> 3. Create credentials → API Key |

> ⚠️ **Security Note**: Never commit `.env.local` to version control. It's already in `.gitignore`.

---

## 🗄️ Database Setup

### Quick Setup

1. Create a new project at [Supabase](https://supabase.com)
2. Go to SQL Editor in your Supabase dashboard
3. Copy contents of `supabase-complete-schema.sql`
4. Paste and run the SQL

### Database Schema Overview

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (name, phone, English level) |
| `courses` | Course catalog (title, description, schedule, requirements) |
| `course_translations` | Translated course content (UA, RU, AR) |
| `registrations` | User course registrations with priority |
| `course_completions` | Completed course records |
| `bot_instructions` | AI configuration (main, contacts, links) |

### Row Level Security (RLS)

All tables have RLS policies enabled:
- Users can only read/write their own data
- Admin access requires specific email domains
- Public read access for courses

For detailed setup instructions, see [SUPABASE-SETUP.md](SUPABASE-SETUP.md).

---

## 🤖 AI Bot Configuration

### Configuration Sections

The bot behavior is configured through three sections in the Admin Panel:

#### 1. Main Instructions

Core personality and behavior rules:
- Identity and personality traits
- Language detection and response rules
- Course recommendation logic
- Response formatting guidelines

#### 2. Contact Information

Staff contacts shared only when explicitly requested:
- Phone numbers
- Email addresses
- Office hours

#### 3. External Links

Resources the bot can recommend:
- Job search sites (Indeed, LinkedIn, JobsIreland)
- English courses (ETB Cork)
- Housing resources
- Government services (Citizens Information)

### Available Placeholders

Use these in your bot instructions:

| Placeholder | Description |
|-------------|-------------|
| `{{COURSES_LIST}}` | Auto-generated list of active courses with details |
| `{{USER_ENGLISH_LEVEL}}` | Current user's English level (None, A1-C2) |
| `{{CONTACTS}}` | Contact information from admin settings |
| `{{EXTERNAL_LINKS}}` | External resources from admin settings |

### Example Bot Instruction

```
IDENTITY
You are the Cork City Partnership AI Assistant. Your personality is warm, 
friendly, and supportive with a touch of Cork-style humor.

USER DATA
- User's English Level: {{USER_ENGLISH_LEVEL}}
- Location: Cork City, Ireland

LANGUAGE RULES
- Detect the language of the user's message
- Reply ONLY in that language (Russian, Ukrainian, Arabic, or English)
- NEVER mix languages in one response

KNOWLEDGE BASE
- Available Courses: {{COURSES_LIST}}
- External Resources: {{EXTERNAL_LINKS}}
- Contacts: {{CONTACTS}}
```

---

## 👨‍💼 Admin Panel

### Accessing Admin Panel

1. Sign in with an admin email (configured in Supabase RLS policies)
2. Click the "Admin" button in the sidebar

### Admin Features

#### 📊 Analytics Dashboard
- Total registered users
- Total course registrations
- Active courses count
- Registration trends

#### 📚 Course Management
- **Create Course**: Add new courses with all details
- **Edit Course**: Modify existing course information
- **Delete Course**: Remove courses (with confirmation)
- **Translate**: Auto-translate to UA/RU/AR using Google Translate
- **Toggle Active**: Show/hide courses from catalog

#### 👥 Student Management
- View registrations per course
- See student profiles (name, phone, English level)
- Mark courses as completed
- Remove students from courses
- Export data to Excel

#### 🤖 Bot Instructions
- Edit main AI instructions
- Update contact information
- Manage external resource links
- Preview changes before saving

#### 👤 All Users
- View all registered users
- See profile completion status
- Filter by English level
- Export user data

---

## 👤 User Flow

### First-Time User

```
1. Landing Page → Click "Sign Up"
2. Enter email and password (or use Google)
3. Onboarding Modal:
   - Enter name
   - Enter phone number
   - Select English level
4. Dashboard with AI chat ready
```

### Returning User

```
1. Landing Page → Click "Sign In"
2. Enter credentials
3. Dashboard with previous chat history
```

### Course Registration

```
1. Browse courses in sidebar or ask AI
2. Click course name (in chat or sidebar)
3. View course details modal
4. Click "Register" button
5. Confirmation message
6. Course appears in "My Courses" section
```

### Course Completion (Admin)

```
1. Admin opens Student Management
2. Selects course
3. Finds student in list
4. Clicks "Mark Complete"
5. Course moves to student's "Completed" section
```

---

## ⚡ Performance Optimizations

### Bundle Size

| Optimization | Impact |
|--------------|--------|
| Tailwind CSS build (not CDN) | ~300KB → ~15KB |
| Tree shaking | Removes unused code |
| Code splitting | Lazy load admin components |
| Minification | Compressed production build |

### Runtime Performance

| Optimization | Implementation |
|--------------|----------------|
| React.memo | Prevent unnecessary re-renders |
| useMemo/useCallback | Memoize expensive computations |
| Lazy loading | `React.lazy()` for heavy components |
| Skeleton loaders | Perceived performance improvement |
| useDebounce | Throttle search input |
| Optimistic updates | Instant UI feedback |

### Data Fetching

| Optimization | Implementation |
|--------------|----------------|
| Supabase Realtime | Live updates without polling |
| Session caching | Gemini context persistence |
| Local storage | Theme and language preferences |
| IndexedDB fallback | Offline mock data support |

---

## 🚀 Deployment

### Automatic Deployment (GitHub Actions)

Deployment happens automatically when you push to `main` branch.

1. **Set up GitHub Secrets**

   Go to Repository → Settings → Secrets and variables → Actions

   Add these secrets:
   - `VITE_GEMINI_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GOOGLE_TRANSLATE_API_KEY` (optional)

2. **Push to main**

```bash
git add .
git commit -m "Your changes"
git push origin main
```

3. **Wait for deployment**

   Check Actions tab for build progress. Site updates at:
   `https://your-username.github.io/Course-Cous/`

### Manual Deployment

```bash
# Build for production
npm run build

# Preview locally
npm run preview

# Deploy dist/ folder to your hosting
```

---

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |

---

## ❓ Troubleshooting

### Common Issues

#### "API Key configuration error"
- Check that `VITE_GEMINI_API_KEY` is set in `.env.local`
- Restart the dev server after adding env variables

#### "Not authenticated" error
- Clear browser localStorage
- Sign out and sign in again
- Check Supabase Auth settings

#### Courses not loading
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check Supabase dashboard for any errors
- Ensure RLS policies are correctly set up

#### Chat not responding
- Check browser console for API errors
- Verify Gemini API key is valid
- Check if you've exceeded API quota

#### Translations not working
- `VITE_GOOGLE_TRANSLATE_API_KEY` is optional
- Without it, translation buttons won't appear
- Check Google Cloud Console for API status

### Getting Help

1. Check existing [Issues](https://github.com/heyheylalaley/Course-Cous/issues)
2. Create a new issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser and OS information
   - Console error messages

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow existing component patterns
- Add translations for new UI strings
- Test on mobile and desktop

---

## 📖 Additional Documentation

- [SUPABASE-SETUP.md](SUPABASE-SETUP.md) - Detailed database setup guide
- [GOOGLE-TRANSLATE-SETUP.md](GOOGLE-TRANSLATE-SETUP.md) - Translation API configuration

---

## 📄 License

This project is proprietary software developed for Cork City Partnership.

---

<div align="center">

**Made with ❤️ by Cork City Partnership**

[⬆ Back to Top](#course-counselor-ai)

</div>
