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
- **Multi-language Support**: Full UI and AI responses in 4 languages (EN, UA, RU, AR) with RTL support for Arabic
- **Real-time Updates**: Course availability and registrations update instantly via Supabase Realtime
- **Accessible Design**: Responsive UI optimized for mobile, tablet, and desktop with swipe gestures
- **Interactive User Tour**: Guided onboarding experience for first-time users
- **Priority Management**: Users can reorder course registrations by priority
- **Calendar Events**: Public and private calendar events with external links support
- **Data Privacy**: Sensitive user data (email, phone, address) is automatically masked in UI

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
| **Calendar Events Integration** | Bot can mention upcoming public calendar events when relevant |
| **Upcoming Events** | Shows future public events with dates, times, and external links in chat context |

### 📚 Course Management

- **Course Catalog**: Browse all available courses with search and filtering
- **Course Details**: View description, schedule, requirements, and availability
- **Real-time Availability**: See how many spots are left in each course
- **Priority Queue**: Position tracking when courses are full (automatic numbering: 1, 2, 3...)
- **Priority Management**: Users can manually reorder their course registrations by priority (move up/down)
- **Course Completion**: Track completed courses separately from active registrations with completion dates
- **Category Organization**: Courses organized by categories with custom icons and colors
- **Category Filtering**: Filter courses by category in sidebar
- **Calendar Integration**: View all course dates and events in interactive calendar format
- **External Links in Events**: Calendar events can include external links (e.g., registration pages)

### 👤 User Features

- **Profile Management**: Set first name, last name, phone number, address, eircode, date of birth, and English level
- **Data Masking**: Sensitive profile data (email, phone, address) is automatically masked for privacy
- **Profile Completion Status**: Visual indicator shows if profile is complete or incomplete
- **Registration Limit**: Maximum 3 active course registrations at a time
- **Registration Priority**: Automatic position assignment (1, 2, 3...) when courses are full
- **Manual Priority Reordering**: Users can change priority order using up/down arrows
- **Course History**: View completed courses separately from active registrations with expandable section
- **Language Preference**: Switch UI language anytime (EN, UA, RU, AR) with persistence
- **Dark Mode**: Toggle with localStorage persistence and smooth theme transitions
- **Calendar View**: Interactive calendar showing all course dates and public events with month navigation
- **Contact Information**: Quick access to organization contact details via modal
- **Chat History**: Persistent conversation history saved to database and restored on login
- **Password Recovery**: Email-based password reset flow with secure token validation
- **User Tour**: Interactive guided tour for new users showing key features (auto-starts on first login)
- **Swipe Gestures**: Mobile-friendly swipe gestures to open/close sidebar (LTR and RTL support)
- **Search & Filter**: Real-time course search with debounced input (300ms delay)

### 🔐 Authentication

- **Email/Password**: Traditional signup and login with validation
- **Google OAuth**: One-click sign-in with Google account
- **Password Recovery**: Email-based password reset flow with secure token validation
- **Session Persistence**: Stay logged in across browser sessions with secure token storage
- **Secure Tokens**: JWT-based authentication via Supabase Auth
- **Profile Onboarding**: First-time user setup modal for essential profile information

### 👨‍💼 Admin Panel

- **Dashboard Analytics**: Overview of users, registrations, courses, and trends
- **Course Management**: Create, edit, delete, translate courses with full CRUD operations
- **Course Categories**: Manage categories with custom icons (100+ icons available) and colors
- **Student Management**: View registrations per course with priority queue, mark completions, remove students
- **Export to Excel**: Export student lists and user data to XLSX format with all fields
- **Bot Instructions**: Configure AI personality, contacts, and external links in 3 separate sections
- **External Links Management**: Manage resource links the bot shares (ETB, FET, job sites, etc.)
- **User Management**: View all registered users with complete profiles and edit capabilities
- **User Profile Editing**: Admins can edit any user's profile including admin-only fields (LDC Ref, IRIS ID)
- **Calendar Events Management**: Create, edit, delete public/private calendar events with dates, times, and external links
- **Event Sorting**: Sort calendar events by date, title, visibility, or creation date
- **App Settings**: Toggle demo mode and manage application-wide settings
- **Analytics Dashboard**: View detailed statistics and trends for users and course registrations

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
│   ├── AdminAllUsers.tsx      # Admin: user list with profiles, editing, export
│   ├── AdminAnalytics.tsx     # Admin: dashboard statistics and trends
│   ├── AdminAppSettings.tsx   # Admin: application settings (demo mode, etc.)
│   ├── AdminBotInstructions.tsx # Admin: AI configuration (3 sections)
│   ├── AdminCalendarEvents.tsx # Admin: calendar events CRUD with sorting
│   ├── AdminCategoryManagement.tsx # Admin: course category management
│   ├── AdminCourseList.tsx    # Admin: course CRUD operations
│   ├── AdminCourseManagement.tsx # Admin: course translations management
│   ├── AdminDashboard.tsx     # Admin: main dashboard layout with tabs
│   ├── AdminStudentList.tsx   # Admin: student management per course with export
│   ├── AdminUserProfileModal.tsx # Admin: edit user profiles (including LDC/IRIS)
│   ├── AlertModal.tsx         # Reusable alert/notification modal
│   ├── AuthScreen.tsx         # Login/signup forms with Google OAuth
│   ├── CalendarEventModal.tsx # Calendar event create/edit modal
│   ├── CalendarModal.tsx      # Calendar view for course dates and events
│   ├── ChatInterface.tsx      # AI chat with message history and streaming
│   ├── ConfirmationModal.tsx  # Reusable confirmation dialog
│   ├── ContactModal.tsx       # Contact information popup
│   ├── CourseCard.tsx         # Course display card component
│   ├── CourseDetailsModal.tsx # Course information modal
│   ├── CourseEditModal.tsx    # Admin: course editor with translations
│   ├── CourseDetailsModal.tsx # Course details and registration modal
│   ├── Dashboard.tsx          # User dashboard with priority management
│   ├── EmailConfirmationModal.tsx # Email confirmation dialog
│   ├── FirstLoginProfileModal.tsx # First-time user profile setup
│   ├── LanguageLevelModal.tsx # English level selection
│   ├── MessageBubble.tsx      # Chat message with markdown and external links
│   ├── NameModal.tsx          # Name input modal
│   ├── OnboardingModal.tsx    # First-time user setup
│   ├── ProfileInfoModal.tsx   # User profile editor
│   ├── Skeletons.tsx          # Loading skeleton components
│   ├── UpdatePasswordPage.tsx # Password recovery page
│   └── UserTour.tsx           # Interactive user onboarding tour
│
├── contexts/                   # React Context providers
│   ├── AuthContext.tsx        # Authentication state management
│   ├── CoursesContext.tsx     # Courses and registrations state
│   ├── UIContext.tsx          # UI state (theme, language, tabs)
│   └── index.ts               # Context exports
│
├── hooks/                      # Custom React hooks
│   ├── useCourses.ts          # Course data fetching hook
│   ├── useDebounce.ts         # Input debouncing hook
│   └── useUserTour.ts         # User tour state management hook
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
| `profiles` | User profiles (first_name, last_name, phone, address, eircode, date_of_birth, english_level, is_admin, ldc_ref, iris_id) |
| `courses` | Course catalog (title, description, difficulty, category, next_course_date, min_english_level, is_active) |
| `course_translations` | Translated course content (UA, RU, AR) for multilingual support |
| `course_categories` | Course categories with icons (lucide-react), colors (Tailwind classes), and sort_order |
| `registrations` | User course registrations with priority queue system (priority: 1, 2, 3...) |
| `course_completions` | Completed course records with admin tracking (completed_at, marked_by) |
| `bot_instructions` | AI configuration (main instructions, contacts, external links) stored as key-value pairs |
| `chat_messages` | Persistent chat history for all users (role, content, timestamp) |
| `calendar_events` | Public and private calendar events (title, description, event_date, event_time, external_link, is_public, created_by) |
| `app_settings` | Application-wide settings (demo_enabled, etc.) |

### Key Database Features

- **Priority Queue System**: Automatic priority assignment (1, 2, 3...) when courses are full
- **Course Translations**: Multi-language support stored in separate `course_translations` table
- **Chat History**: Full conversation history with role-based messages (user/model)
- **Calendar Events**: Support for external links, times, and public/private visibility
- **Category System**: Flexible category management with icons and colors
- **Admin Fields**: LDC Ref and IRIS ID fields for administrative tracking
- **Profile Completion**: Database functions to check profile completeness
- **Completion Tracking**: Timestamp and admin tracking for course completions

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
| `{{COURSES_LIST}}` | Auto-generated list of active courses with details (title, description, category, difficulty, dates, English level requirements) |
| `{{USER_ENGLISH_LEVEL}}` | Current user's English level (None, A1, A2, B1, B2, C1, C2) |
| `{{CONTACTS}}` | Contact information from admin settings (phone, email, office hours) |
| `{{EXTERNAL_LINKS}}` | External resources from admin settings (job sites, housing, English courses, government services) |
| Upcoming Events | Automatically included in bot context when available (future public calendar events) |

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
- **Create Course**: Add new courses with all details (title, description, category, difficulty, dates, English level requirements, translations)
- **Edit Course**: Modify existing course information with real-time updates
- **Delete Course**: Remove courses (with confirmation and safety checks)
- **Translate**: Auto-translate course descriptions to UA/RU/AR using Google Translate API
- **Toggle Active**: Show/hide courses from catalog without deletion
- **Bulk Operations**: Manage multiple courses at once

#### 📁 Category Management
- **Create Categories**: Add new course categories with custom names
- **Icon Selection**: Choose from 100+ Lucide React icons for each category
- **Color Customization**: Set custom Tailwind CSS colors for visual distinction
- **Sort Order**: Organize categories by custom sort order
- **Edit/Delete**: Modify or remove categories (with course reassignment options)

#### 📅 Calendar Events Management
- **Create Events**: Add calendar events with title, description, date, time, and optional external link
- **Public/Private Events**: Control visibility (public events visible to all, private only to admins)
- **External Links**: Add external links to events (e.g., registration pages, event websites)
- **Event Sorting**: Sort events by date (ascending/descending), title, visibility, or creation date
- **Edit/Delete**: Modify or remove existing events
- **Future Events Filtering**: Bot automatically includes upcoming public events in chat context

#### 👥 Student Management
- **Course Selection**: View all courses with registration counts
- **Student List**: View registrations per course with priority queue positions
- **Complete Profiles**: See full student profiles (name, phone, address, eircode, date of birth, English level, LDC Ref, IRIS ID)
- **Mark Complete**: Mark courses as completed with automatic timestamp and admin tracking
- **Remove Students**: Remove students from courses with confirmation dialog
- **Export to Excel**: Export student lists to XLSX format with all profile fields including LDC Ref and IRIS ID
- **Search & Filter**: Filter and search students by various criteria
- **Priority Display**: See each student's priority position (1, 2, 3...) in the queue

#### 🤖 Bot Instructions
- Edit main AI instructions
- Update contact information
- Manage external resource links
- Preview changes before saving

#### 👤 All Users
- **User List**: View all registered users with complete profiles in sortable table
- **Profile Details**: See full profile information including LDC Ref and IRIS ID (admin-only fields)
- **Profile Editing**: Edit any user's profile directly from the list (including admin-only fields)
- **Profile Completion**: See profile completion status at a glance with visual indicators
- **Registration Status**: View each user's registered and completed courses
- **Export to Excel**: Export complete user data to XLSX format with all fields
- **Filtering**: Filter by English level, registration status, profile completion, and more
- **User Search**: Search users by name, email, or other criteria

#### ⚙️ App Settings
- **Demo Mode**: Toggle demo mode for testing and demonstration purposes
- **Application Configuration**: Manage application-wide settings
- **Settings Persistence**: All settings saved to database

#### 📊 Analytics Dashboard
- **User Statistics**: Total registered users, active users, new registrations
- **Course Statistics**: Total courses, active courses, registration trends
- **Registration Analytics**: Course popularity, registration patterns
- **Completion Rates**: Track course completion statistics
- **Trends**: Visual representation of data trends over time

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
4. Profile saved → Dashboard appears
5. User Tour automatically starts (interactive guide):
   - Welcome screen
   - Chat tab highlight
   - Course catalog explanation
   - Dashboard tab highlight
   - Calendar button highlight
   - Admin tab (if admin user)
6. After tour → Chat interface with welcome message from AI assistant
```

### Returning User

```
1. Landing Page → Click "Sign In"
2. Enter credentials
3. Dashboard with previous chat history
```

### Course Registration

```
1. Browse courses in sidebar (with search) or ask AI for recommendations
2. Click course name (bold names in chat open modal directly) or course card in sidebar
3. View course details modal with full information:
   - Title and description (in user's language)
   - Category with icon and color
   - Difficulty level
   - Next course date
   - Minimum English level required
   - Current availability and queue length
4. Click "Register" button
5. Confirmation modal appears with course details
6. Course appears in "My Courses" section with priority number (1, 2, or 3)
7. If course is full, user is added to priority queue with position number
8. User can reorder priorities using up/down arrows in Dashboard
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
| `npm run dev` | Start development server with HMR (Hot Module Replacement) |
| `npm run build` | Build for production with optimizations (minification, tree-shaking) |
| `npm run preview` | Preview production build locally before deployment |

## 🎯 Advanced Features

### Demo Mode
- **Toggle Demo Mode**: Admins can enable/disable demo mode from App Settings
- **Auto Tour**: Demo mode automatically triggers user tour on every login
- **Testing**: Useful for demonstrations and testing without affecting production data

### Priority Queue System
- **Automatic Assignment**: When a course is full, new registrations get priority numbers (1, 2, 3...)
- **Manual Reordering**: Users can manually change priority order using up/down arrows
- **Visual Indicators**: Priority levels shown with color-coded badges (green=1st, blue=2nd, gray=3rd)
- **Queue Position**: Displayed for all registrations showing user's position in waitlist

### Multi-language Support
- **4 Languages**: Full UI translation in English (EN), Ukrainian (UA), Russian (RU), Arabic (AR)
- **RTL Support**: Complete right-to-left layout support for Arabic
- **Course Translations**: Course descriptions translated and stored separately
- **AI Language Detection**: Bot automatically detects and responds in user's language
- **Language Persistence**: User's language preference saved in localStorage

### Calendar Events System
- **Public Events**: Visible to all users in calendar modal and mentioned by bot when relevant
- **Private Events**: Admin-only events for internal planning and scheduling
- **External Links**: Events can include external links (e.g., registration pages, event websites)
- **Time Support**: Events can have specific times in addition to dates
- **Event Icons**: Visual icons for different event types (100+ icons available)
- **Sorting Options**: Sort by date, title, visibility, or creation date

### Category Management
- **100+ Icons**: Choose from extensive Lucide React icon library
- **Custom Colors**: Set Tailwind CSS colors for visual distinction
- **Sort Order**: Customizable category order for organized display
- **Icon Preview**: See icon preview before saving category

### Data Export
- **Excel Format**: Export student lists and user data to XLSX format
- **Complete Data**: All fields included in export (including admin-only fields like LDC Ref and IRIS ID)
- **Multiple Exports**: Export from different views (Student List, All Users)
- **Excel Compatibility**: Generated files compatible with Microsoft Excel, Google Sheets, and LibreOffice

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

#### User Tour not appearing
- Tour only starts automatically for new users or when demo mode is enabled
- Check browser localStorage for tour completion status
- Manually start tour using the sparkle icon in sidebar footer

#### Priority changes not saving
- Ensure you're clicking the up/down arrows in Dashboard "My Courses" section
- Check browser console for errors
- Verify you have less than 3 registrations (max limit)
- Refresh page and try again

#### Calendar events not showing
- Verify events are marked as "public" (private events only visible to admins)
- Check event dates are in the future (past events filtered out in bot context)
- Ensure calendar modal is opened from sidebar calendar button

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
- [ADMIN-PROFILE-EDITING-SETUP.md](ADMIN-PROFILE-EDITING-SETUP.md) - Admin profile editing setup with LDC Ref and IRIS ID fields
- [MOBILE_OPTIMIZATION_RECOMMENDATIONS.md](MOBILE_OPTIMIZATION_RECOMMENDATIONS.md) - Mobile optimization guidelines
- [DATABASE_OPTIMIZATION_ANALYSIS.md](DATABASE_OPTIMIZATION_ANALYSIS.md) - Database optimization recommendations

## 🔒 Security & Privacy Features

### Data Protection
- **Data Masking**: Automatic masking of sensitive user data (email, phone, address) in UI
- **Row Level Security (RLS)**: Database-level security policies ensuring users only access their own data
- **Admin Access Control**: Admin privileges restricted to specific email domains via RLS policies
- **Secure Authentication**: JWT-based authentication via Supabase Auth with secure token storage
- **Password Recovery**: Secure token-based password reset flow with email validation
- **Session Management**: Secure session persistence with automatic expiration

### Admin-Only Fields
- **LDC Ref**: Local Development Center Reference (admin-only field, editable by admins only)
- **IRIS ID**: IRIS system identifier (admin-only field, editable by admins only)
- **Profile Editing**: Admins can edit any user profile including admin-only fields
- **User Data Export**: Admins can export user data to Excel for reporting (includes LDC Ref and IRIS ID)

## 🎨 UI/UX Features

### Design Principles
- **Responsive Design**: Mobile-first approach with breakpoints for all screen sizes (mobile, tablet, desktop)
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation support, focus management
- **RTL Support**: Full right-to-left layout support for Arabic language (sidebars, modals, forms)
- **Dark Mode**: Complete dark theme with smooth transitions and localStorage persistence
- **Loading States**: Skeleton loaders and spinners for all async operations
- **Error Handling**: User-friendly error messages with actionable suggestions and retry options
- **Swipe Gestures**: Mobile-friendly swipe gestures for sidebar navigation (LTR and RTL aware)

### User Experience
- **Onboarding Flow**: Smooth first-time user experience with guided setup modal
- **Interactive Tour**: Step-by-step interactive tour highlighting key features (auto-starts for new users)
- **Real-time Feedback**: Instant UI updates for all user actions with optimistic updates
- **Search & Filter**: Fast course search with debounced input (300ms) and category filtering
- **Modal System**: Consistent modal patterns for confirmations, information, and editing
- **Toast Notifications**: Non-intrusive success/error messages with auto-dismiss
- **Swipe Gestures**: Mobile-friendly swipe gestures for sidebar navigation (LTR and RTL aware)
- **Loading States**: Skeleton loaders and spinners for all async operations
- **Error Recovery**: Graceful error handling with retry options and helpful error messages
- **Data Masking**: Automatic masking of sensitive data (email, phone, address) in UI for privacy
- **Priority Management**: Intuitive up/down arrows for reordering course priorities
- **Calendar Navigation**: Easy month navigation in calendar with event highlighting

---

## 📄 License

This project is proprietary software developed for Cork City Partnership.

---

<div align="center">

**Made with ❤️ by Cork City Partnership**

[⬆ Back to Top](#ccplearn)

</div>
