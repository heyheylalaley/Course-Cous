import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Mail, ExternalLink, FileText } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { db } from '../services/db';

interface AdminBotInstructionsProps {
  language: Language;
  onBack: () => void;
}

interface InstructionSection {
  section: string;
  content: string;
  language: Language;
}

export const AdminBotInstructions: React.FC<AdminBotInstructionsProps> = ({ language, onBack }) => {
  const [instructions, setInstructions] = useState<InstructionSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  const sections = [
    { key: 'main', label: t.botInstructionsMain || 'Main Instructions', icon: FileText },
    { key: 'contacts', label: t.botInstructionsContacts || 'Contact Information', icon: Mail },
    { key: 'external_links', label: t.botInstructionsExternalLinks || 'External Links (ETB, FET, etc.)', icon: ExternalLink }
  ];

  useEffect(() => {
    loadInstructions();
  }, []);

  const loadInstructions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allInstructions = await db.getAllBotInstructions();
      
      // Initialize with default structure if empty
      if (allInstructions.length === 0) {
        const defaultInstructions: InstructionSection[] = sections.map(s => ({
          section: s.key,
          content: '',
          language: 'en'
        }));
        setInstructions(defaultInstructions);
      } else {
        // Group by section and get English version (or first available)
        const grouped = new Map<string, InstructionSection>();
        allInstructions.forEach(inst => {
          if (!grouped.has(inst.section) || inst.language === 'en') {
            grouped.set(inst.section, inst);
          }
        });
        
        // Ensure all sections exist
        const result: InstructionSection[] = sections.map(s => {
          const existing = grouped.get(s.key);
          return existing || { section: s.key, content: '', language: 'en' };
        });
        
        setInstructions(result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load instructions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentChange = (section: string, content: string) => {
    setInstructions(prev => prev.map(inst => 
      inst.section === section ? { ...inst, content } : inst
    ));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Save all instructions (using English as default language for now)
      // In future, can extend to support multiple languages
      for (const inst of instructions) {
        await db.saveBotInstruction(inst.section, inst.content, 'en');
      }
      
      setSuccess(t.botInstructionsSaved || 'Instructions saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save instructions');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="mb-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            ← {t.back || 'Back'}
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t.botInstructionsTitle || 'Bot Instructions Management'}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t.botInstructionsDesc || 'Configure bot behavior, contact information, and external links (e.g., ETB, FET for English courses)'}
          </p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Instructions Sections */}
        <div className="space-y-6">
          {sections.map(({ key, label, icon: Icon }) => {
            const instruction = instructions.find(inst => inst.section === key);
            const content = instruction?.content || '';

            return (
              <div key={key} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                    <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {label}
                  </h2>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {key === 'main' && (
                      <span>
                        {t.botInstructionsMainDesc || 'Main instructions for the bot. This is the core behavior description.'}
                        <br />
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block space-y-1">
                          <span className="block">💡 <strong>Available placeholders:</strong></span>
                          <span className="block">• <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{"{{COURSES_LIST}}"}</code> — inserts the list of active courses</span>
                          <span className="block">• <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{"{{USER_ENGLISH_LEVEL}}"}</code> — inserts user's English level (None, A1, A2, B1, B2, C1, C2)</span>
                          <span className="block">• <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{"{{CONTACTS}}"}</code> — inserts contact information (optional)</span>
                          <span className="block">• <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{"{{EXTERNAL_LINKS}}"}</code> — inserts external links (optional)</span>
                        </span>
                      </span>
                    )}
                    {key === 'contacts' && (t.botInstructionsContactsDesc || 'Contact information that the bot can share with users (phone, email, address, etc.)')}
                    {key === 'external_links' && (t.botInstructionsExternalLinksDesc || 'External links to other organizations (e.g., ETB for English courses, FET for further education). Format: Organization Name - Description - URL')}
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => handleContentChange(key, e.target.value)}
                    rows={key === 'main' ? 12 : key === 'contacts' ? 6 : 8}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent font-mono text-sm"
                    placeholder={
                      key === 'main' 
                        ? 'Example: You are a helpful AI Course Counselor...'
                        : key === 'contacts'
                        ? 'Example:\nPhone: +353 21 XXX XXXX\nEmail: info@example.com\nAddress: Cork, Ireland'
                        : 'Example:\nETB - Education and Training Boards for English courses - https://www.etb.ie\nFET - Further Education and Training - https://www.fet.ie'
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {isSaving ? (t.saving || 'Saving...') : (t.save || 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
};
