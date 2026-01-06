# Course-Cous

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

A modern AI-powered course counseling application that helps users find and register for courses based on their interests and English proficiency level. Built with React, TypeScript, Vite, and Supabase.

## ✨ Features

### 🤖 AI Course Counselor
- Chat with an AI assistant powered by Google Gemini
- Personalized course recommendations based on user profile
- Multi-language support (responds in user's language)
- Persistent chat history saved in database
- Token-efficient responses (only mentions relevant courses)
- Asks for clarification when request is unclear

### 📚 Course Management
- Browse and search through available courses
- Real-time course updates
- Course details with descriptions, difficulty levels, and English requirements
- Course titles remain in original English (not translated)
- Automatic translation of course descriptions to all supported languages

### 📝 Course Registration
- Register for up to 3 courses with priority management
- Visual course queue indicators
- Easy course removal and priority adjustment

### 👤 User Profiles
- Complete profile management with:
  - Personal information (name, contact, address, date of birth)
  - English proficiency level
  - Language preferences
- Profile updates with real-time sync

### 🌍 Multi-language Support
- Available in **English**, **Ukrainian**, **Russian**, and **Arabic**
- RTL (Right-to-Left) support for Arabic
- Interface translations for all components
- AI bot responds in user's language automatically

### 🌙 Dark Mode
- Toggle between light and dark themes
- Persistent theme preference
- Smooth transitions

### 🔐 Authentication
- Secure email/password authentication via Supabase
- Google OAuth integration
- Session management
- Protected routes

### 👨‍💼 Admin Dashboard
Comprehensive admin panel with multiple sections:

- **Analytics Dashboard**
  - Course enrollment statistics
  - Student registration charts
  - Real-time data visualization

- **Student Management**
  - Detailed student lists per course
  - Export to Excel/CSV
  - Student profile information
  - Registration status

- **Course Management**
  - Add, edit, delete courses
  - Activate/deactivate courses
  - Set course requirements (English level, difficulty)
  - Manage course links and descriptions

- **Bot Instructions Management**
  - Customize bot behavior and personality
  - Add contact information for users
  - Configure external links (e.g., ETB, FET for English courses)
  - All instructions stored in database (no hardcoded values)
  - Support for `{{COURSES_LIST}}` placeholder

### 🔄 Automatic Translations
- Course descriptions automatically translated using Google Translate API
- Supports all application languages
- Course titles remain in original English
- Manual translation updates available

### 💬 Chat Features
- Persistent chat history (survives page refresh)
- Real-time streaming responses
- Markdown support in messages
- Course titles displayed in **bold**
- Welcome messages and context awareness

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Gemini API key** - [Get one here](https://aistudio.google.com/app/apikey)
- **Google Translate API key** (optional) - [Get one here](https://console.cloud.google.com/)
- **Supabase account** - [Sign up here](https://supabase.com)

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

3. **Set up environment variables**
   
   Create a `.env.local` file in the project root:
   ```env
   VITE_GEMINI_API_KEY=your-gemini-api-key
   VITE_GOOGLE_TRANSLATE_API_KEY=your-google-translate-api-key
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Set up Supabase database**
   
   See [SUPABASE-SETUP.md](SUPABASE-SETUP.md) for detailed instructions:
   - Creating the database schema
   - Running migrations
   - Setting up authentication
   - Configuring admin users
   - Setting up RLS policies

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to `http://localhost:5173` (Vite default port)

## 📖 Documentation

- **[Supabase Setup Guide](SUPABASE-SETUP.md)** - Complete Supabase configuration including schema, migrations, RLS policies, and admin setup
- **[Google Translate Setup](GOOGLE-TRANSLATE-SETUP.md)** - Guide for setting up automatic course translation
- **[Bot Instruction Template](BOT-INSTRUCTION-TEMPLATE.txt)** - Template for configuring bot instructions in admin panel

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling (via CDN)
- **React Markdown** - Markdown rendering in chat

### Backend & Services
- **Supabase** - PostgreSQL database with Row Level Security (RLS)
- **Supabase Auth** - Authentication (Email/Password, Google OAuth)
- **Google Gemini API** - AI chat (gemini-2.5-flash-lite model)
- **Google Translate API** - Automatic translations

### Deployment
- **GitHub Pages** - Static hosting
- **GitHub Actions** - CI/CD pipeline

## 📁 Project Structure

```
Course-Cous/
├── components/              # React components
│   ├── AdminDashboard.tsx   # Main admin panel
│   ├── AdminAnalytics.tsx   # Analytics and statistics
│   ├── AdminBotInstructions.tsx  # Bot instructions management
│   ├── AdminCourseManagement.tsx # Course CRUD operations
│   ├── AdminCourseList.tsx  # Course listing for admins
│   ├── AdminStudentList.tsx # Student management
│   ├── AlertModal.tsx       # Error/warning modals
│   ├── AuthScreen.tsx       # Login/signup screen
│   ├── ChatInterface.tsx    # AI chat interface
│   ├── CourseCard.tsx       # Course card component
│   ├── CourseDetailsModal.tsx # Course details popup
│   ├── CourseEditModal.tsx  # Course editing modal
│   ├── Dashboard.tsx        # Main user dashboard
│   ├── LanguageLevelModal.tsx # English level selection
│   ├── MessageBubble.tsx    # Chat message component
│   ├── NameModal.tsx        # Name input modal
│   ├── OnboardingModal.tsx  # First-time user onboarding
│   └── ProfileInfoModal.tsx  # Profile information modal
├── services/                # Business logic
│   ├── db.ts               # Database operations (Supabase)
│   ├── geminiService.ts    # AI service (Gemini API)
│   └── translateService.ts # Translation service
├── hooks/                   # Custom React hooks
│   └── useCourses.ts       # Course data fetching with real-time updates
├── translations.ts         # Multi-language translations
├── types.ts                # TypeScript type definitions
├── constants.ts            # App constants (legacy course data)
├── BOT-INSTRUCTION-TEMPLATE.txt  # Template for bot instructions
├── supabase-complete-schema.sql  # Complete database schema
└── .github/
    └── workflows/
        └── deploy.yml      # GitHub Actions deployment config
```

## 🤖 Bot Instructions Configuration

All bot instructions are stored in the database and can be managed through the admin panel. No hardcoded instructions in the code.

### Setting Up Bot Instructions

1. **Access Admin Panel**
   - Log in as an admin user
   - Navigate to "Admin Panel" → "Bot Instructions"

2. **Configure Main Instructions**
   - Use the template from `BOT-INSTRUCTION-TEMPLATE.txt`
   - Include `{{COURSES_LIST}}` placeholder - it will be automatically replaced with the current course list
   - Add rules for language detection, course recommendations, etc.

3. **Add Contact Information**
   - Phone numbers, emails, addresses
   - Bot will share this when users ask for help

4. **Configure External Links**
   - Links to other organizations (e.g., ETB, FET for English courses)
   - Format: `Organization Name - Description - URL`
   - Bot will suggest these when asked about unavailable courses

### Bot Instruction Template

See [BOT-INSTRUCTION-TEMPLATE.txt](BOT-INSTRUCTION-TEMPLATE.txt) for a complete template with:
- Language detection rules
- Course recommendation guidelines
- Token efficiency rules
- Clarification requests when confused

## 🌐 Supported Languages

- 🇬🇧 **English** - Default language
- 🇺🇦 **Ukrainian** - Full translation support
- 🇷🇺 **Russian** - Full translation support
- 🇸🇦 **Arabic** - Full translation support with RTL layout

### Language Features
- Interface translations for all UI elements
- AI bot automatically detects and responds in user's language
- Course descriptions translated (titles remain in English)
- RTL support for Arabic

## 🔒 Security

### Authentication & Authorization
- Secure authentication with Supabase Auth
- Row Level Security (RLS) policies on all tables
- Admin-only access to sensitive operations
- Session management and token refresh

### Data Protection
- API keys stored in environment variables and GitHub Secrets
- No sensitive data in client-side code
- Secure database queries with RLS
- Protected admin routes

### Best Practices
- Input validation
- SQL injection prevention (via Supabase)
- XSS protection
- Secure password handling

## 📝 Database Setup

The project includes a single, idempotent SQL file that sets up the entire database:

- **`supabase-complete-schema.sql`** - Complete database schema

### What's Included
- User profiles and authentication
- Course management tables
- Admin functionality
- Chat history storage
- Course translations
- Bot instructions
- All RLS policies
- Database functions and triggers

### Running the Schema

1. Open Supabase SQL Editor
2. Copy contents of `supabase-complete-schema.sql`
3. Paste and run
4. Verify all tables and policies are created

**Note:** This script is idempotent - safe to run multiple times. It uses `DROP IF EXISTS` and `CREATE IF NOT EXISTS` to prevent conflicts.

See [SUPABASE-SETUP.md](SUPABASE-SETUP.md) for detailed setup instructions.

## 🚀 Deployment

The project is configured for automatic deployment to GitHub Pages via GitHub Actions.

### GitHub Actions Workflow

The `.github/workflows/deploy.yml` file handles:
- Building the React app
- Deploying to GitHub Pages
- Environment variable injection
- Deployment status tracking

### Required GitHub Secrets

Configure these in your repository settings (Settings → Secrets and variables → Actions):

- `VITE_GEMINI_API_KEY` - Your Gemini API key
- `VITE_GOOGLE_TRANSLATE_API_KEY` - Your Google Translate API key
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Deployment Process

1. Push to `main` branch
2. GitHub Actions automatically:
   - Builds the application
   - Injects environment variables
   - Deploys to GitHub Pages
3. Site available at `https://yourusername.github.io/Course-Cous/`

### Manual Deployment

```bash
npm run build
# Deploy the 'dist' folder to your hosting service
```

## 🧪 Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Development Tips

- Use `.env.local` for local environment variables
- Check browser console for development logs (wrapped in `import.meta.env.DEV`)
- Supabase provides real-time subscriptions for live updates
- Hot module replacement (HMR) enabled in development

## 🐛 Troubleshooting

### Common Issues

**Bot not responding:**
- Check Gemini API key in environment variables
- Verify API key has proper permissions
- Check browser console for errors

**Database connection errors:**
- Verify Supabase URL and anon key
- Check RLS policies are set up correctly
- Ensure user is authenticated

**Translations not working:**
- Verify Google Translate API key
- Check API quota and billing
- Ensure API is enabled in Google Cloud Console

**Admin panel not accessible:**
- Verify user has `is_admin = true` in database
- Check RLS policies for admin access
- Ensure user is logged in

## 📧 Support

For questions, issues, or contributions:
- Open an issue on [GitHub](https://github.com/heyheylalaley/Course-Cous/issues)
- Check existing documentation in the repository
- Review [SUPABASE-SETUP.md](SUPABASE-SETUP.md) for database issues

## 📄 License

This project is private and proprietary.

---

Made with ❤️ using React, TypeScript, and AI
