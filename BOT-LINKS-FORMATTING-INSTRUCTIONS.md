# Инструкция по обновлению промта бота для правильного форматирования ссылок

## Проблема
Бот не всегда правильно форматирует ссылки на внешние ресурсы. Иногда он дает только название без ссылки, или дает URL без markdown формата.

## Решение
Добавьте в промт бота новую секцию с четкими правилами форматирования ссылок.

## Способ 1: Автоматическое обновление (рекомендуется)

Запустите SQL скрипт `fix-bot-links-formatting.sql` в Supabase SQL Editor.

## Способ 2: Ручное обновление через админку

1. Зайдите в админку → Bot Instructions
2. Откройте секцию "Main Instructions"
3. Найдите секцию "📚 KNOWLEDGE BASE" (или секцию перед "📅 CALENDAR EVENTS" или "📊 COURSE RULES")
4. Вставьте следующую секцию ПЕРЕД секцией "📅 CALENDAR EVENTS" (или перед "📊 COURSE RULES", если секции CALENDAR EVENTS нет):

```
═══════════════════════════════════════════════════════════════════════════════
🔗 EXTERNAL LINKS FORMATTING — CRITICAL, MANDATORY
═══════════════════════════════════════════════════════════════════════════════

⚠️ MANDATORY: When you mention ANY resource from EXTERNAL_LINKS section, you MUST use markdown link format!

CRITICAL RULES FOR EXTERNAL LINKS:

✅ ALWAYS use markdown link format: [Organization Name](URL)
✅ ALWAYS include the URL when mentioning external resources
✅ You can add description AFTER the link, but the link is MANDATORY
✅ Format: [Name](URL) Description text

❌ FORBIDDEN formats:
• Just organization name without link: "Welcome English" (WRONG - missing link!)
• Just URL without markdown: "https://www.welcomeenglish.ie/" (WRONG - use [Name](URL)!)
• Plain text mention: "ETB Cork - Free English classes" (WRONG - missing link!)
• Mixing formats: "ETB Cork — Free English classes — https://www.corketb.ie" (WRONG - use [Name](URL)!)

CORRECT Examples:

✅ CORRECT:
• [Welcome English](https://www.welcomeenglish.ie/) - Free English classes for adults
• [ETB Cork](https://www.corketb.ie) - Free English classes for adults
• [NASC Migrant Centre](https://nascireland.org) - English & integration support
• [Fáilte Isteach](https://www.thirdageireland.ie/failte-isteach) - Free conversational English with volunteers

✅ CORRECT (with email):
• UCC Language Centre - Email: r.flynn@ucc.ie or [link](https://www.ucc.ie/en/esol/)

WRONG Examples (DO NOT DO THIS):

❌ WRONG:
• Welcome English - Free English classes for adults - https://www.welcomeenglish.ie/
• ETB Cork — Free English classes for adults — https://www.corketb.ie
• Just mentioning "ETB" or "Welcome English" without the link
• NASC Migrant Centre - English & integration support (without link!)

IMPORTANT:
• When user asks about English courses, job sites, housing, or any external resource from EXTERNAL_LINKS → ALWAYS use [Name](URL) format
• The link must be clickable markdown format, not plain text URL
• If you mention a resource from EXTERNAL_LINKS section, the link is MANDATORY, not optional!
• Every external resource MUST be formatted as [Name](URL) - no exceptions!

```

5. Также обновите секцию "🚫 FORBIDDEN", добавив правило:
   - Найдите строку: `✗ Mixing languages in one response`
   - После неё добавьте: `✗ Mentioning external resources without markdown link format [Name](URL)`

6. Сохраните изменения (кнопка Save)

## Проверка

После обновления проверьте, что:
1. В промте есть секция "🔗 EXTERNAL LINKS FORMATTING"
2. В секции FORBIDDEN есть правило о форматировании ссылок
3. Бот теперь всегда использует формат [Name](URL) для внешних ссылок

## Примеры правильного форматирования

**Правильно:**
- `[Welcome English](https://www.welcomeenglish.ie/) - Free English classes for adults`
- `[ETB Cork](https://www.corketb.ie) - Free English classes for adults`

**Неправильно:**
- `Welcome English - Free English classes for adults - https://www.welcomeenglish.ie/`
- `ETB Cork — Free English classes for adults — https://www.corketb.ie`
- Просто упоминание "Welcome English" без ссылки
