# CCPLearn

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.0_Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)

**CCPLearn — AI-powered course advisor for Cork City Partnership with intelligent chat support, course registration system, and comprehensive admin panel.**

[Live Demo](https://ccplearn.pages.dev/) • [Report Bug](https://github.com/heyheylalaley/Course-Cous/issues) • [Request Feature](https://github.com/heyheylalaley/Course-Cous/issues)

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

CCPLearn is a full-stack web application designed for Cork City Partnership to help users discover and register for educational courses. The application features an AI-powered chatbot that provides personalized course recommendations based on the user's English proficiency level and career interests.

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
| **Streaming Responses** | Real-time text generation using Google Gemini 2.0 Flash with token-by-token streaming |
| **Context Awareness** | Remembers user's English level, completed courses, and full conversation history |
| **Language Detection** | Automatically detects and responds in user's language (EN, RU, UA, AR) |
| **Course Recommendations** | Smart suggestions based on English level requirements and course availability |
| **External Resources** | Provides links to job sites, housing, English courses, government services, etc. |
| **Clickable Course Names** | Bold course names in chat open registration modal directly |
| **External Links** | Links open in new tab with visual indicators and proper security |
| **Chat History Persistence** | All conversations saved to database and restored on login |
| **Session Management** | Intelligent session caching with automatic reinitialization on course/profile changes |
| **Markdown Support** | Rich text formatting with React Markdown for better readability |
| **Error Handling** | Graceful error recovery with retry logic and user-friendly messages |

### 📚 Course Management

- **Course Catalog**: Browse all available courses with search and filtering
- **Course Details**: View description, schedule, requirements, and availability
- **Real-time Availability**: See how many spots are left in each course
- **Priority Queue**: Position tracking when courses are full (automatic numbering)
- **Course Completion**: Track completed courses separately from active registrations
- **Category Organization**: Courses organized by categories with visual indicators
- **Calendar Integration**: View all course dates and events in calendar format

### 👤 User Features

- **Profile Management**: Set name, phone number, address, eircode, date of birth, and English level
- **Registration Limit**: Maximum 3 active course registrations
- **Registration Priority**: Automatic position assignment (1, 2, 3...) when courses are full
- **Course History**: View completed courses separately from active registrations
- **Language Preference**: Switch UI language anytime (EN, UA, RU, AR)
- **Dark Mode**: Toggle with localStorage persistence
- **Calendar View**: View all course dates and events in a calendar interface
- **Contact Information**: Quick access to organization contact details
- **Chat History**: Persistent conversation history saved to database
- **Password Recovery**: Email-based password reset functionality

### 🔐 Authentication

- **Email/Password**: Traditional signup and login with validation
- **Google OAuth**: One-click sign-in with Google account
- **Password Recovery**: Email-based password reset flow with secure token validation
- **Session Persistence**: Stay logged in across browser sessions with secure token storage
- **Secure Tokens**: JWT-based authentication via Supabase Auth
- **Profile Onboarding**: First-time user setup modal for essential profile information

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
│   ├── CalendarModal.tsx       # Calendar view for course dates and events
│   ├── ContactModal.tsx       # Contact information popup
│   ├── CourseCard.tsx         # Course display card component
│   ├── CourseDetailsModal.tsx # Course information modal
│   ├── CourseEditModal.tsx    # Admin: course editor
│   ├── CourseRegistrationConfirmModal.tsx # Course registration confirmation
│   ├── Dashboard.tsx          # User dashboard with sidebar
│   ├── EmailConfirmationModal.tsx # Email confirmation dialog
│   ├── FirstLoginProfileModal.tsx # First-time user profile setup
│   ├── LanguageLevelModal.tsx # English level selection
│   ├── MessageBubble.tsx      # Chat message with markdown support
│   ├── NameModal.tsx          # Name input modal
│   ├── OnboardingModal.tsx    # First-time user setup
│   ├── ProfileInfoModal.tsx   # User profile editor
│   ├── Skeletons.tsx          # Loading skeleton components
│   └── UpdatePasswordPage.tsx # Password recovery page
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

Navigate to `http://localhost:5173` (default Vite port)

> **Note**: The port may vary. Check the terminal output for the actual URL.

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
| `profiles` | User profiles (name, phone, address, eircode, date of birth, English level, admin flag) |
| `courses` | Course catalog (title, description, schedule, requirements, difficulty, category, active status) |
| `course_translations` | Translated course content (UA, RU, AR) for multilingual support |
| `course_categories` | Course categories with icons and colors for organization |
| `registrations` | User course registrations with priority queue system |
| `course_completions` | Completed course records with admin tracking |
| `bot_instructions` | AI configuration (main instructions, contacts, external links) |
| `chat_messages` | Persistent chat history for all users |
| `calendar_events` | Public and private calendar events for course dates and announcements |

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
- **Create Course**: Add new courses with all details (title, description, category, difficulty, dates, English level requirements)
- **Edit Course**: Modify existing course information with real-time updates
- **Delete Course**: Remove courses (with confirmation and safety checks)
- **Translate**: Auto-translate course descriptions to UA/RU/AR using Google Translate API
- **Toggle Active**: Show/hide courses from catalog without deletion
- **Category Management**: Organize courses by categories with custom icons and colors
- **Calendar Events**: Create and manage calendar events for course dates and announcements

#### 👥 Student Management
- View registrations per course with priority queue
- See complete student profiles (name, phone, address, English level, etc.)
- Mark courses as completed with timestamp tracking
- Remove students from courses with confirmation
- Export student data to Excel (XLSX format)
- Filter and search students by various criteria

#### 🤖 Bot Instructions
- Edit main AI instructions
- Update contact information
- Manage external resource links
- Preview changes before saving

#### 👤 All Users
- View all registered users with complete profiles
- See profile completion status at a glance
- Filter by English level, registration status, and more
- Export user data to Excel for reporting
- View user's registered and completed courses

#### 📅 Calendar Management
- Create public and private calendar events
- View all course dates in calendar format
- Manage course schedules and announcements
- Filter events by visibility (public/admin-only)

---

## 👤 User Flow

### First-Time User

```
1. Landing Page → Click "Sign Up"
2. Enter email and password (or use Google OAuth)
3. First Login Profile Modal appears:
   - Enter first name and last name
   - Enter phone number
   - Enter address and eircode (optional)
   - Enter date of birth (optional)
   - Select English level
4. Dashboard with AI chat ready
5. Welcome message from AI assistant
```

### Returning User

```
1. Landing Page → Click "Sign In"
2. Enter credentials
3. Dashboard with previous chat history
```

### Course Registration

```
1. Browse courses in sidebar or ask AI for recommendations
2. Click course name (in chat or sidebar)
3. View course details modal with full information
4. Click "Register" button
5. Confirmation modal appears
6. Course appears in "My Courses" section with priority number
7. If course is full, user is added to priority queue
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
| React.memo | Prevent unnecessary re-renders of course cards and messages |
| useMemo/useCallback | Memoize expensive computations (filtered courses, translations) |
| Lazy loading | `React.lazy()` for heavy components (Chat, Dashboard, Admin) |
| Skeleton loaders | Perceived performance improvement during data loading |
| useDebounce | Throttle search input (300ms delay) |
| Optimistic updates | Instant UI feedback for registrations and profile updates |
| Code splitting | Separate bundles for admin and user features |

### Data Fetching

| Optimization | Implementation |
|--------------|----------------|
| Supabase Realtime | Live updates without polling for courses and registrations |
| Session caching | Gemini context persistence with smart reinitialization |
| Local storage | Theme and language preferences with persistence |
| Chat history caching | Database-backed chat history with efficient loading |
| Optimistic UI updates | Instant feedback before server confirmation |

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
- Without it, translation buttons won't appear in admin panel
- Check Google Cloud Console for API status and billing
- Ensure Cloud Translation API is enabled in your project

#### Chat history not loading
- Check Supabase database connection
- Verify `chat_messages` table exists and has proper RLS policies
- Check browser console for database errors
- Ensure user is properly authenticated

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

- [SUPABASE-SETUP.md](SUPABASE-SETUP.md) - Detailed database setup guide with RLS policies
- [GOOGLE-TRANSLATE-SETUP.md](GOOGLE-TRANSLATE-SETUP.md) - Translation API configuration and usage
- [SUPABASE-EMAIL-TEMPLATES.md](SUPABASE-EMAIL-TEMPLATES.md) - Email template configuration for password recovery

## 🎨 UI/UX Features

### Design Principles
- **Responsive Design**: Mobile-first approach with breakpoints for all screen sizes
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation support
- **RTL Support**: Full right-to-left layout support for Arabic language
- **Dark Mode**: Complete dark theme with smooth transitions
- **Loading States**: Skeleton loaders and spinners for better perceived performance
- **Error Handling**: User-friendly error messages with actionable suggestions

### User Experience
- **Onboarding Flow**: Smooth first-time user experience with guided setup
- **Real-time Feedback**: Instant UI updates for all user actions
- **Search & Filter**: Fast course search with debounced input
- **Modal System**: Consistent modal patterns for confirmations and information
- **Toast Notifications**: Non-intrusive success/error messages

---

## 📄 License

This project is proprietary software developed for Cork City Partnership.

---

<div align="center">

**Made with ❤️ by Cork City Partnership**

[⬆ Back to Top](#ccplearn)

</div>
