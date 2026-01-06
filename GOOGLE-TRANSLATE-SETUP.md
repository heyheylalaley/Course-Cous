# Google Translate API Setup

This guide explains how to set up Google Translate API for automatic course translation.

## Why Google Translate API?

The application automatically translates course titles and descriptions to all supported languages (English, Ukrainian, Russian, Arabic) when courses are created or updated. Translations are stored in the database to avoid repeated API calls.

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Cloud Translation API**:
   - Navigate to **APIs & Services** → **Library**
   - Search for "Cloud Translation API"
   - Click **Enable**

### 2. Create API Key

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Copy the API key
4. (Optional) Restrict the API key:
   - Click on the API key to edit it
   - Under **API restrictions**, select **Restrict key**
   - Choose **Cloud Translation API**
   - Click **Save**

### 3. Configure Environment Variables

**Locally:**
Add to your `.env.local` file:
```env
VITE_GOOGLE_TRANSLATE_API_KEY=your-api-key-here
```

**On GitHub (for deployment):**
1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Add a new secret:
   - Name: `VITE_GOOGLE_TRANSLATE_API_KEY`
   - Value: Your API key

### 4. Update GitHub Actions Workflow

If deploying via GitHub Actions, make sure your workflow includes the secret:
```yaml
env:
  VITE_GOOGLE_TRANSLATE_API_KEY: ${{ secrets.VITE_GOOGLE_TRANSLATE_API_KEY }}
```

## How It Works

1. **Course Creation/Update**: When an admin creates or updates a course, the system automatically:
   - Translates the title and description to all supported languages (en, ua, ru, ar)
   - Saves translations to the `course_translations` table
   - Falls back to English if translation fails (doesn't block course creation)

2. **Course Display**: When users view courses:
   - The system loads translations based on their selected language
   - Falls back to English if translation is not available
   - All translations are cached in the database for performance

## Cost Considerations

- Google Cloud Translation API offers a **free tier**: 500,000 characters per month
- After the free tier, pricing is $20 per 1 million characters
- Translations are cached in the database, so API is only called when courses are created/updated

## Troubleshooting

### Translations not working?

1. **Check API Key**: Verify `VITE_GOOGLE_TRANSLATE_API_KEY` is set correctly
2. **Check API Status**: Ensure Cloud Translation API is enabled in Google Cloud Console
3. **Check Console**: Look for translation errors in browser console
4. **Check Quota**: Verify you haven't exceeded the free tier limit

### Fallback Behavior

If the API key is not configured or translation fails:
- Course creation/update will still succeed
- Courses will display in English (original language)
- Error will be logged to console but won't block the operation

## Testing

To test translation:
1. Create a new course as an admin
2. Check the `course_translations` table in Supabase
3. Switch language in the UI and verify course descriptions are translated
