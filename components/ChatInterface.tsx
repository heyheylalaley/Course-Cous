import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { Message, Language } from '../types';
import { sendMessageToGemini, initializeChat } from '../services/geminiService';
import { MessageBubble } from './MessageBubble';
import { AlertModal } from './AlertModal';
import { Send, Sparkles, Loader2, Menu } from 'lucide-react';
import { db } from '../services/db';
import { TRANSLATIONS } from '../translations';
import { useCourses } from '../contexts/CoursesContext';
import { useUI } from '../contexts/UIContext';

interface ChatInterfaceProps {
  language: Language;
  onOpenSidebar?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = memo(({ language, onOpenSidebar }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    message: string;
    type: 'error' | 'warning' | 'info' | 'success';
    actionButton?: { text: string; onClick: () => void };
  }>({ isOpen: false, message: '', type: 'info' });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const t = TRANSLATIONS[language] as any;
  
  // Load courses for clickable course names and get refresh function
  const { courses, refreshRegistrations } = useCourses();
  
  // Get UI context for navigation
  const { setActiveTab } = useUI();

  // Load chat history from database
  const loadChatHistory = async (): Promise<Message[]> => {
    try {
      return await db.getChatHistory();
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  };

  // Save single message to database
  const saveChatMessage = async (role: 'user' | 'model', content: string) => {
    try {
      await db.saveChatMessage(role, content);
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  };

  // Track language to detect changes
  const prevLanguageRef = useRef<Language>(language);
  
  // Initialize chat and restore or create welcome message
  useEffect(() => {
    // Only reinitialize if language actually changed
    const languageChanged = prevLanguageRef.current !== language;
    
    // Prevent double initialization unless language changed
    if (initialized.current && !languageChanged) return;
    
    if (languageChanged) {
      prevLanguageRef.current = language;
      initialized.current = false; // Reset to allow reinitialization
    }
    
    initialized.current = true;
    
    const setup = async () => {
      try {
        const profile = await db.getProfile().catch(() => undefined);
        await initializeChat(profile, language);
        
        // Load saved chat history from database
        const savedMessages = await loadChatHistory();
        
        if (savedMessages.length > 0) {
          // Restore all saved messages, ensuring proper format
          const restoredMessages = savedMessages.map((msg: any) => ({
            id: msg.id || `${Date.now()}-${Math.random()}`,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
            isStreaming: false,
            isError: false
          }));
          setMessages(restoredMessages);
        } else {
          // Only show greeting if no history exists
          const greeting: Message = {
            id: 'welcome',
            role: 'model',
            content: t.welcomeMessage,
            timestamp: new Date()
          };
          setMessages([greeting]);
          await saveChatMessage('model', t.welcomeMessage);
        }
      } catch (error) {
        console.error('Error setting up chat:', error);
        // Show welcome message even if history load fails
        const greeting: Message = {
          id: 'welcome',
          role: 'model',
          content: t.welcomeMessage,
          timestamp: new Date()
        };
        setMessages([greeting]);
      }
    };
    
    setup();
    
    // Reset initialization flag when component unmounts
    return () => {
      // Only reset if language didn't change (component is actually unmounting)
      if (!languageChanged) {
        initialized.current = false;
      }
    };
  }, [language]); // Removed t.welcomeMessage dependency

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle course click for registration
  const handleCourseClick = useCallback(async (courseId: string, courseTitle: string) => {
    try {
      // Check if already registered
      const registrations = await db.getRegistrations();
      const alreadyRegistered = registrations.some(r => r.courseId === courseId);
      
      if (alreadyRegistered) {
        setAlertModal({
          isOpen: true,
          message: `${t.courseAlreadyRegistered}: "${courseTitle}"`,
          type: 'info'
        });
        return;
      }
      
      // Register for course
      await db.addRegistration(courseId);
      
      setAlertModal({
        isOpen: true,
        message: `${t.courseRegistrationSuccess}: "${courseTitle}"`,
        type: 'success'
      });
    } catch (error: any) {
      console.error('Course registration error:', error);
      
      // Check for specific error messages
      const errorMessage = error?.message || t.courseRegistrationError;
      
      if (errorMessage.includes('Maximum 3 courses') || errorMessage.includes('Максимум')) {
        setAlertModal({
          isOpen: true,
          message: t.maxCoursesReached,
          type: 'warning'
        });
      } else if (errorMessage.includes('profile') || errorMessage.includes('профиль') || errorMessage.includes('профіль')) {
        setAlertModal({
          isOpen: true,
          message: t.profileIncompleteDesc,
          type: 'warning',
          actionButton: {
            text: t.completeProfile || 'Complete Profile',
            onClick: () => setActiveTab('dashboard')
          }
        });
      } else {
        setAlertModal({
          isOpen: true,
          message: `${t.courseRegistrationError}: ${errorMessage}`,
          type: 'error'
        });
      }
    }
  }, [t]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    // Save user message to database
    await saveChatMessage('user', userMessage.content);
    
    setInputText('');
    setIsLoading(true);

    // Placeholder for bot response
    const botMessageId = (Date.now() + 1).toString();
    const initialBotMessage: Message = {
      id: botMessageId,
      role: 'model',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    setMessages(prev => [...prev, initialBotMessage]);

    try {
      // Get current profile to pass to bot (for English level filtering)
      const profile = await db.getProfile().catch(() => undefined);
      
      let fullContent = '';
      const stream = sendMessageToGemini(userMessage.content, profile, language);
      
      for await (const chunk of stream) {
        fullContent += chunk;
        setMessages(prev => 
          prev.map(msg => 
            msg.id === botMessageId 
              ? { ...msg, content: fullContent } 
              : msg
          )
        );
      }
      
      // Save bot response to database after streaming completes
      await saveChatMessage('model', fullContent);
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, isStreaming: false } 
            : msg
        )
      );

    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessage = error?.message || "Sorry, a connection error occurred. Please try again.";
      // Save error message to database
      await saveChatMessage('model', errorMessage).catch(() => {});
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, content: errorMessage, isStreaming: false, isError: true } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-gray-900 relative">
      {/* Header - Always visible */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-600 to-green-700">
        <div className="flex items-center gap-3">
          {onOpenSidebar && (
            <button
              onClick={onOpenSidebar}
              className="lg:hidden p-2.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors shadow-md active:scale-95"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="p-2 bg-white/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{t.assistantName}</h2>
            <p className="text-xs text-green-100 flex items-center font-medium">
              <span className="w-2 h-2 rounded-full bg-green-300 mr-1.5"></span>
              {t.online}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="max-w-3xl mx-auto">
          {messages.map((msg) => (
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              courses={courses}
              onCourseClick={handleCourseClick}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-3xl mx-auto">
          <form 
            onSubmit={handleSendMessage}
            className="flex items-center gap-2 sm:gap-3 bg-gray-50 dark:bg-gray-800 p-2 rounded-2xl border border-gray-200 dark:border-gray-700 focus-within:border-green-300 dark:focus-within:border-green-600 focus-within:ring-2 focus-within:ring-green-100 dark:focus-within:ring-green-900/30 transition-all"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t.chatPlaceholder}
              className="flex-1 bg-transparent px-3 sm:px-4 py-2 outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 text-sm sm:text-base"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className={`p-2 sm:p-3 rounded-xl transition-all duration-200 flex items-center justify-center flex-shrink-0
                ${!inputText.trim() || isLoading 
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                  : 'bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600 shadow-md hover:shadow-lg active:scale-95'
                }`}
            >
              {isLoading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Send className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
            {t.chatDisclaimer}
          </p>
        </div>
      </div>

      {/* Alert Modal for course registration feedback */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => {
          // Refresh registrations if it was a success to update sidebar
          if (alertModal.type === 'success') {
            refreshRegistrations();
          }
          setAlertModal(prev => ({ ...prev, isOpen: false }));
        }}
        message={alertModal.message}
        language={language}
        type={alertModal.type}
        actionButton={alertModal.actionButton}
      />
    </div>
  );
});

ChatInterface.displayName = 'ChatInterface';

export default ChatInterface;