# Course Counselor AI

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

AI-консультант по курсам с поддержкой чата, регистрации на курсы и админ-панелью. Построен на React 19, TypeScript, Vite, Tailwind CSS и Supabase.

## 🌐 Demo

**[https://heyheylalaley.github.io/Course-Cous/](https://heyheylalaley.github.io/Course-Cous/)**

## ✨ Основные возможности

- 🤖 **AI-ассистент** на базе Google Gemini с потоковыми ответами
- 📚 **Управление курсами** с real-time обновлениями через Supabase
- 📝 **Регистрация** до 3 курсов с приоритетами
- 👤 **Профили пользователей** с полной информацией
- 🌍 **4 языка**: English, Українська, Русский, العربية (RTL)
- 🌙 **Тёмная тема** с сохранением в localStorage
- 🔐 **Аутентификация** через Supabase (Email/Password, Google OAuth)
- 👨‍💼 **Админ-панель**: аналитика, управление курсами, инструкции бота

## 🛠️ Технологии

| Frontend | Backend | Deployment |
|----------|---------|------------|
| React 19 | Supabase (PostgreSQL + Auth) | GitHub Pages |
| TypeScript | Google Gemini API | GitHub Actions |
| Vite | Google Translate API | |
| Tailwind CSS 3.4 | | |

## 📁 Структура проекта

```
├── components/          # React компоненты
│   ├── Admin*.tsx      # Админ-панель
│   ├── Chat*.tsx       # Чат интерфейс
│   ├── Course*.tsx     # Карточки курсов
│   ├── Dashboard.tsx   # Личный кабинет
│   └── Skeletons.tsx   # Skeleton loaders
├── contexts/           # React Context (Auth, Courses, UI)
├── hooks/              # Custom hooks (useCourses, useDebounce)
├── services/           # API сервисы (db, gemini, translate)
├── translations.ts     # Переводы интерфейса
└── types.ts           # TypeScript типы
```

## 🚀 Быстрый старт

### 1. Клонирование

```bash
git clone https://github.com/heyheylalaley/Course-Cous.git
cd Course-Cous
```

### 2. Установка зависимостей

```bash
npm install
```

### 3. Настройка переменных окружения

Создайте `.env.local`:

```env
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GOOGLE_TRANSLATE_API_KEY=your-translate-api-key  # опционально
```

### 4. Настройка базы данных

1. Создайте проект в [Supabase](https://supabase.com)
2. Выполните SQL из `supabase-complete-schema.sql`
3. Подробнее: [SUPABASE-SETUP.md](SUPABASE-SETUP.md)

### 5. Запуск

```bash
npm run dev
```

Откройте http://localhost:3000

## 🔧 Оптимизации производительности

- **Tailwind CSS Build** вместо CDN (~300KB → ~15KB)
- **React Context** для state management (AuthContext, CoursesContext, UIContext)
- **Lazy Loading** компонентов (AdminDashboard, ChatInterface, Dashboard)
- **React.memo** для предотвращения лишних ре-рендеров
- **Supabase Realtime** вместо polling
- **Skeleton Loaders** для улучшения perceived performance
- **useDebounce** для поиска курсов
- **Оптимистичные обновления** для регистраций
- **Кэширование Gemini сессии** между сообщениями

## 📝 Скрипты

```bash
npm run dev      # Запуск dev-сервера
npm run build    # Сборка для production
npm run preview  # Превью production сборки
```

## 🚀 Деплой на GitHub Pages

Деплой автоматический через GitHub Actions при пуше в `main`.

### Необходимые секреты (Settings → Secrets):

- `VITE_GEMINI_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_TRANSLATE_API_KEY` (опционально)

## 📖 Документация

- [SUPABASE-SETUP.md](SUPABASE-SETUP.md) - Настройка базы данных
- [GOOGLE-TRANSLATE-SETUP.md](GOOGLE-TRANSLATE-SETUP.md) - Настройка переводов

## 📄 Лицензия

Проприетарный проект.

---

Made with ❤️ by Cork City Partnership
