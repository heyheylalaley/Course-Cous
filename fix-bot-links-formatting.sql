-- FIX BOT LINKS FORMATTING - Add mandatory link formatting rule
-- Run this in Supabase SQL Editor
-- This adds a critical section about formatting external links correctly

DO $$
DECLARE
  current_content TEXT;
  new_content TEXT;
  insert_position INT;
  section_text TEXT;
  lookback_start INT;
  lookback_text TEXT;
  separator_pos INT;
BEGIN
  -- Get current content
  SELECT content INTO current_content
  FROM bot_instructions
  WHERE section = 'main' AND language = 'en';
  
  -- Check if section already exists
  IF current_content LIKE '%EXTERNAL LINKS FORMATTING%' THEN
    RAISE NOTICE 'Section already exists, skipping update';
    RETURN;
  END IF;
  
  IF current_content IS NULL THEN
    RAISE NOTICE 'No content found in bot_instructions';
    RETURN;
  END IF;
  
  -- Define the new section text
  section_text := E'\n═══════════════════════════════════════════════════════════════════════════════\n🔗 EXTERNAL LINKS FORMATTING — CRITICAL, MANDATORY\n═══════════════════════════════════════════════════════════════════════════════\n\n⚠️ MANDATORY: When you mention ANY resource from EXTERNAL_LINKS section, you MUST use markdown link format!\n\nCRITICAL RULES FOR EXTERNAL LINKS:\n\n✅ ALWAYS use markdown link format: [Organization Name](URL)\n✅ ALWAYS include the URL when mentioning external resources\n✅ You can add description AFTER the link, but the link is MANDATORY\n✅ Format: [Name](URL) Description text\n\n❌ FORBIDDEN formats:\n• Just organization name without link: "Welcome English" (WRONG - missing link!)\n• Just URL without markdown: "https://www.welcomeenglish.ie/" (WRONG - use [Name](URL)!)\n• Plain text mention: "ETB Cork - Free English classes" (WRONG - missing link!)\n• Mixing formats: "ETB Cork — Free English classes — https://www.corketb.ie" (WRONG - use [Name](URL)!)\n\nCORRECT Examples:\n\n✅ CORRECT:\n• [Welcome English](https://www.welcomeenglish.ie/) - Free English classes for adults\n• [ETB Cork](https://www.corketb.ie) - Free English classes for adults\n• [NASC Migrant Centre](https://nascireland.org) - English & integration support\n• [Fáilte Isteach](https://www.thirdageireland.ie/failte-isteach) - Free conversational English with volunteers\n\n✅ CORRECT (with email):\n• UCC Language Centre - Email: r.flynn@ucc.ie or [link](https://www.ucc.ie/en/esol/)\n\nWRONG Examples (DO NOT DO THIS):\n\n❌ WRONG:\n• Welcome English - Free English classes for adults - https://www.welcomeenglish.ie/\n• ETB Cork — Free English classes for adults — https://www.corketb.ie\n• Just mentioning "ETB" or "Welcome English" without the link\n• NASC Migrant Centre - English & integration support (without link!)\n\nIMPORTANT:\n• When user asks about English courses, job sites, housing, or any external resource from EXTERNAL_LINKS → ALWAYS use [Name](URL) format\n• The link must be clickable markdown format, not plain text URL\n• If you mention a resource from EXTERNAL_LINKS section, the link is MANDATORY, not optional!\n• Every external resource MUST be formatted as [Name](URL) - no exceptions!\n\n';
  
  -- Try to find insertion point before CALENDAR EVENTS section
  insert_position := POSITION('📅 CALENDAR EVENTS —' IN current_content);
  
  IF insert_position = 0 THEN
    insert_position := POSITION('📅 CALENDAR EVENTS' IN current_content);
  END IF;
  
  IF insert_position = 0 THEN
    -- Try alternative: before COURSE RULES section
    insert_position := POSITION('📊 COURSE RULES' IN current_content);
  END IF;
  
  IF insert_position > 0 THEN
    -- Insert right before the found position (simple approach)
    new_content := SUBSTRING(current_content FROM 1 FOR insert_position - 1) ||
      section_text ||
      SUBSTRING(current_content FROM insert_position);
  ELSE
    -- Fallback: append before FORBIDDEN section
    IF current_content LIKE '%🚫 FORBIDDEN%' THEN
      new_content := REPLACE(
        current_content,
        E'\n═══════════════════════════════════════════════════════════════════════════════\n🚫 FORBIDDEN',
        section_text || E'\n═══════════════════════════════════════════════════════════════════════════════\n🚫 FORBIDDEN'
      );
    ELSE
      -- Last resort: append at the end
      new_content := current_content || section_text;
    END IF;
  END IF;
  
  -- Also update FORBIDDEN section to include link formatting rule
  IF new_content LIKE '%🚫 FORBIDDEN%' AND new_content NOT LIKE '%Mentioning external resources without markdown link format%' THEN
    new_content := REPLACE(
      new_content,
      E'✗ Mixing languages in one response',
      E'✗ Mixing languages in one response\n✗ Mentioning external resources without markdown link format [Name](URL)'
    );
  END IF;
  
  -- Update the database
  UPDATE bot_instructions
  SET content = new_content, updated_at = NOW()
  WHERE section = 'main' AND language = 'en';
  
  RAISE NOTICE '✅ Update completed';
END $$;

-- Verify the update
SELECT 
  section,
  language,
  LENGTH(content) as content_length,
  CASE 
    WHEN content LIKE '%EXTERNAL LINKS FORMATTING%' THEN '✅ Updated successfully'
    ELSE '❌ Update failed'
  END as status,
  updated_at
FROM bot_instructions
WHERE section = 'main' AND language = 'en';
