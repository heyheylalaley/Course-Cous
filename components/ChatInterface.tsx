import React, { useState, useRef, useEffect, memo, useCallback, useMemo } from 'react';
import { Message, Language, Course } from '../types';
import { sendMessageToGemini, initializeChat } from '../services/geminiService';
import { MessageBubble } from './MessageBubble';
import { AlertModal } from './AlertModal';
import { CourseDetailsModal } from './CourseDetailsModal';
import { Send, Sparkles, Loader2, Menu, Trash2 } from 'lucide-react';
import { db } from '../services/db';
import { TRANSLATIONS } from '../translations';
import { useCourses } from '../contexts/CoursesContext';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';

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
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [courseQueues, setCourseQueues] = useState<Map<string, number>>(new Map());
  const [registrations, setRegistrations] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const streamingMessageIdRef = useRef<string | null>(null);
  const streamingContentRef = useRef<string>('');
  const updateAnimationFrameRef = useRef<number | null>(null);
  const shouldAutoScrollRef = useRef<boolean>(true);
  const t = TRANSLATIONS[language] as any;
  
  // Load courses for clickable course names and get refresh function
  const { courses, refreshRegistrations, registrations: contextRegistrations } = useCourses();

  // Load course queues and registrations
  useEffect(() => {
    const loadData = async () => {
      try {
        const queues = await db.getCourseQueues();
        const queueMap = new Map<string, number>();
        queues.forEach(q => {
          queueMap.set(q.courseId, q.queueLength);
        });
        setCourseQueues(queueMap);
        
        const regs = await db.getRegistrations();
        setRegistrations(regs.map(r => r.courseId));
      } catch (error) {
        console.error('Error loading course data:', error);
      }
    };
    loadData();
  }, [contextRegistrations]);
  
  // Get UI context for navigation
  const { setActiveTab } = useUI();
  
  // Get user profile and demo status from auth context
  const { userProfile, isDemoUser } = useAuth();

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
  
  // Helper to check if a message is a welcome message (in any language)
  const isWelcomeMessage = (content: string): boolean => {
    const welcomeStarts = [
      "Hello! 👋 I'm your AI assistant",
      "Привіт! 👋 Я ШІ-асистент",
      "Здравствуйте! 👋 Я ИИ-ассистент",
      "مرحبًا! 👋 أنا المساعد الذكي"
    ];
    return welcomeStarts.some(start => content.startsWith(start));
  };

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
    
    // Set flag immediately to prevent concurrent initialization
    initialized.current = true;
    let isCancelled = false;
    
    const setup = async () => {
      try {
        const profile = await db.getProfile().catch(() => undefined);
        await initializeChat(profile, language);
        
        // Check if cancelled (component unmounted or effect re-ran)
        if (isCancelled) return;
        
        // Load welcome message from settings or use default
        const welcomeMsg = await db.getWelcomeMessage(language).catch(() => null);
        const welcomeContent = welcomeMsg || t.welcomeMessage;
        
        // Load saved chat history from database
        const savedMessages = await loadChatHistory();
        
        // Check if cancelled again after async operation
        if (isCancelled) return;
        
        // Ограничение количества сообщений для оптимизации памяти
        // Показываем последние 100 сообщений (или все, если меньше 100)
        const MAX_DISPLAYED_MESSAGES = 100;
        const messagesToDisplay = savedMessages.length > MAX_DISPLAYED_MESSAGES 
          ? savedMessages.slice(-MAX_DISPLAYED_MESSAGES)
          : savedMessages;
        
        // Check if there's already a welcome message in history
        const hasWelcomeMessage = messagesToDisplay.some((msg: any) => 
          msg.role === 'model' && isWelcomeMessage(msg.content)
        );
        
        if (messagesToDisplay.length > 0) {
          // Filter out duplicate welcome messages - keep only the first one
          let foundFirstWelcome = false;
          const restoredMessages = messagesToDisplay
            .filter((msg: any, index: number) => {
              // If this is a welcome message
              if (msg.role === 'model' && isWelcomeMessage(msg.content)) {
                // Keep only the first welcome message
                if (!foundFirstWelcome) {
                  foundFirstWelcome = true;
                  return true;
                }
                // Skip duplicate welcome messages
                return false;
              }
              return true;
            })
            .map((msg: any, index: number) => {
              // If it's the first message and it's a welcome message, replace with current language version
              if (index === 0 && msg.role === 'model' && isWelcomeMessage(msg.content)) {
                return {
                  id: 'welcome',
                  role: 'model' as const,
                  content: welcomeContent,
                  timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
                  isStreaming: false,
                  isError: false
                };
              }
              return {
                id: msg.id || `${Date.now()}-${Math.random()}`,
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
                isStreaming: false,
                isError: false
              };
            });
          setMessages(restoredMessages);
        } else if (!hasWelcomeMessage) {
          // Only show greeting if no history exists AND no welcome message was found
          // Double-check current messages state to avoid duplicates
          setMessages(prevMessages => {
            // If there's already a welcome message in state, don't add another
            const alreadyHasWelcome = prevMessages.some(msg => 
              msg.role === 'model' && isWelcomeMessage(msg.content)
            );
            if (alreadyHasWelcome) {
              return prevMessages;
            }
            
            const greeting: Message = {
              id: 'welcome',
              role: 'model',
              content: welcomeContent,
              timestamp: new Date()
            };
            // Save welcome message to database
            saveChatMessage('model', welcomeContent).catch(console.error);
            return [greeting];
          });
        }
      } catch (error) {
        console.error('Error setting up chat:', error);
        // Only show welcome message if not cancelled and not already present
        if (!isCancelled) {
          setMessages(prevMessages => {
            const alreadyHasWelcome = prevMessages.some(msg => 
              msg.role === 'model' && isWelcomeMessage(msg.content)
            );
            if (alreadyHasWelcome) {
              return prevMessages;
            }
            const greeting: Message = {
              id: 'welcome',
              role: 'model',
              content: t.welcomeMessage,
              timestamp: new Date()
            };
            return [greeting];
          });
        }
      }
    };
    
    setup();
    
    // Reset initialization flag when component unmounts
    return () => {
      isCancelled = true;
      // Only reset if language didn't change (component is actually unmounting)
      if (!languageChanged) {
        initialized.current = false;
      }
    };
  }, [language, t.welcomeMessage]); // Added t.welcomeMessage to update when language changes

  // Check if user is near bottom of scroll container
  const checkIfNearBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    
    const threshold = 100; // pixels from bottom
    const isNearBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    shouldAutoScrollRef.current = isNearBottom;
    return isNearBottom;
  }, []);

  // Auto-scroll to bottom (only if user is near bottom)
  const scrollToBottom = useCallback((force = false) => {
    if (!force && !shouldAutoScrollRef.current) return;
    
    // Use requestAnimationFrame for smoother scrolling
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, []);

  // Track scroll position to determine if we should auto-scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      checkIfNearBottom();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [checkIfNearBottom]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (updateAnimationFrameRef.current !== null) {
        cancelAnimationFrame(updateAnimationFrameRef.current);
      }
    };
  }, []);

  // Optimized scroll effect - only scroll when messages change significantly
  useEffect(() => {
    // Only auto-scroll if user is near bottom
    if (shouldAutoScrollRef.current) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]); // Only depend on length, not full array

  // Memoize messages list to prevent unnecessary re-renders
  const displayedMessages = useMemo(() => {
    if (messages.length > 100) {
      return messages.slice(-100);
    }
    return messages;
  }, [messages]);

  // Handle course click - show confirmation modal instead of direct registration
  const handleCourseClick = useCallback(async (courseId: string, courseTitle: string) => {
    // Check if this is a demo user
    if (isDemoUser) {
      setAlertModal({
        isOpen: true,
        message: t.demoModeAlert || 'You are in demo mode. To register for courses, please create an account or sign in with Google.',
        type: 'info'
      });
      return;
    }

    try {
      // Check if course is already completed
      const completedCourses = await db.getUserCompletedCourses();
      const alreadyCompleted = completedCourses.some(c => c.courseId === courseId);
      
      if (alreadyCompleted) {
        setAlertModal({
          isOpen: true,
          message: t.courseAlreadyCompleted || `Congratulations! You have already completed "${courseTitle}". You cannot register for this course again.`,
          type: 'success'
        });
        return;
      }
      
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
      
      // Find the course details
      const course = courses.find(c => c.id === courseId);
      if (!course) {
        setAlertModal({
          isOpen: true,
          message: t.courseNotFound || 'Course not found',
          type: 'error'
        });
        return;
      }
      
      // Show course details modal with registration option
      setSelectedCourse(course);
    } catch (error: any) {
      console.error('Course click error:', error);
      setAlertModal({
        isOpen: true,
        message: t.courseRegistrationError || 'An error occurred',
        type: 'error'
      });
    }
  }, [t, isDemoUser, courses]);

  // Handle course registration
  const handleRegisterCourse = useCallback(async (courseId: string) => {
    const course = selectedCourse;
    if (!course || course.id !== courseId) return;
    
    setIsRegistering(true);
    
    try {
      await db.addRegistration(courseId);
      
      // Refresh registrations
      const regs = await db.getRegistrations();
      setRegistrations(regs.map(r => r.courseId));
      await refreshRegistrations();
      
      setSelectedCourse(null);
      setAlertModal({
        isOpen: true,
        message: `${t.courseRegistrationSuccess}: "${course.title}". ${t.courseRegistrationEmailInfo || 'You will receive email information as soon as you are invited to the course.'}`,
        type: 'success'
      });
    } catch (error: any) {
      console.error('Course registration error:', error);
      
      const errorMessage = error?.message || t.courseRegistrationError;
      
      if (errorMessage === 'DEMO_USER_CANNOT_REGISTER') {
        setAlertModal({
          isOpen: true,
          message: t.demoModeAlert || 'You are in demo mode. To register for courses, please create an account or sign in with Google.',
          type: 'info'
        });
      } else if (errorMessage.includes('Maximum 3 courses') || errorMessage.includes('Максимум')) {
        setAlertModal({
          isOpen: true,
          message: t.maxCoursesReached,
          type: 'error'
        });
      } else if (errorMessage.includes('profile') || errorMessage.includes('профиль') || errorMessage.includes('профіль')) {
        setAlertModal({
          isOpen: true,
          message: t.profileIncompleteDesc,
          type: 'error',
          actionButton: {
            text: t.completeProfile || 'Complete Profile',
            onClick: () => setActiveTab('dashboard')
          }
        });
      } else if (errorMessage.includes('completed') || errorMessage.includes('already been completed')) {
        setAlertModal({
          isOpen: true,
          message: t.courseAlreadyCompleted || 'You have already completed this course.',
          type: 'success'
        });
      } else {
        setAlertModal({
          isOpen: true,
          message: `${t.courseRegistrationError}: ${errorMessage}`,
          type: 'error'
        });
      }
    } finally {
      setIsRegistering(false);
    }
  }, [selectedCourse, t, setActiveTab, refreshRegistrations]);

  // Handle chat clear
  const handleClearChat = useCallback(async () => {
    try {
      await db.clearChatHistory();
      
      // Reset initialization flag to allow effect to create welcome message
      initialized.current = false;
      
      // Reinitialize chat with fresh greeting
      const profile = await db.getProfile().catch(() => undefined);
      await initializeChat(profile, language);
      
      // Load welcome message from settings or use default
      const welcomeMsg = await db.getWelcomeMessage(language).catch(() => null);
      const welcomeContent = welcomeMsg || t.welcomeMessage;
      
      const greeting: Message = {
        id: 'welcome',
        role: 'model',
        content: welcomeContent,
        timestamp: new Date()
      };
      setMessages([greeting]);
      await saveChatMessage('model', welcomeContent);
      
      // Mark as initialized to prevent duplicate
      initialized.current = true;
      
      setShowClearConfirm(false);
      setAlertModal({
        isOpen: true,
        message: t.clearChatSuccess || 'Chat history cleared successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error clearing chat:', error);
      setShowClearConfirm(false);
      setAlertModal({
        isOpen: true,
        message: t.alertTitle || 'Error clearing chat',
        type: 'error'
      });
    }
  }, [language, t]);

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
      // Use profile from context (avoids extra DB call)
      let fullContent = '';
      streamingMessageIdRef.current = botMessageId;
      streamingContentRef.current = '';
      const stream = sendMessageToGemini(userMessage.content, userProfile, language);
      
      // Throttle updates using requestAnimationFrame to prevent blocking
      const updateMessage = () => {
        if (updateAnimationFrameRef.current !== null) {
          cancelAnimationFrame(updateAnimationFrameRef.current);
        }
        
        updateAnimationFrameRef.current = requestAnimationFrame(() => {
          const currentContent = streamingContentRef.current;
          const currentId = streamingMessageIdRef.current;
          
          if (currentId) {
            setMessages(prev => {
              // Only update if content actually changed to prevent unnecessary re-renders
              const existingMsg = prev.find(msg => msg.id === currentId);
              if (existingMsg && existingMsg.content === currentContent) {
                return prev; // No change, return same reference
              }
              
              return prev.map(msg => 
                msg.id === currentId 
                  ? { ...msg, content: currentContent } 
                  : msg
              );
            });
            
            // Only scroll if user is at bottom
            if (shouldAutoScrollRef.current) {
              scrollToBottom(true);
            }
          }
          
          updateAnimationFrameRef.current = null;
        });
      };
      
      for await (const chunk of stream) {
        fullContent += chunk;
        streamingContentRef.current = fullContent;
        updateMessage(); // Throttled update
      }
      
      // Final update after streaming completes - ensure last chunk is rendered
      streamingContentRef.current = fullContent;
      if (updateAnimationFrameRef.current !== null) {
        cancelAnimationFrame(updateAnimationFrameRef.current);
      }
      
      // Force final update synchronously
      setMessages(prev => 
        prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, content: fullContent, isStreaming: false } 
            : msg
        )
      );
      
      streamingMessageIdRef.current = null;
      updateAnimationFrameRef.current = null;
      
      // Scroll to bottom after final update
      shouldAutoScrollRef.current = true;
      scrollToBottom(true);
      
      // Save bot response to database after streaming completes
      await saveChatMessage('model', fullContent);

    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessage = error?.message || "Sorry, a connection error occurred. Please try again.";
      
      // Clean up streaming refs
      if (updateAnimationFrameRef.current !== null) {
        cancelAnimationFrame(updateAnimationFrameRef.current);
        updateAnimationFrameRef.current = null;
      }
      streamingMessageIdRef.current = null;
      
      // Save error message to database
      await saveChatMessage('model', errorMessage).catch(() => {});
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, content: errorMessage, isStreaming: false, isError: true } 
            : msg
        )
      );
      
      // Scroll to bottom after error
      shouldAutoScrollRef.current = true;
      scrollToBottom(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-gray-900 relative">
      {/* Scrollable container with sticky header inside */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header - Sticky inside scroll container for mobile */}
        <div className="sticky top-0 z-20 flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-600 to-green-700">
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
          {/* Clear Chat Button */}
          <button
            onClick={() => setShowClearConfirm(true)}
            className="p-2.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors shadow-md active:scale-95"
            aria-label={t.clearChat || 'Clear Chat'}
            title={t.clearChat || 'Clear Chat'}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-gray-50/50 dark:bg-gray-800/50"
        >
          <div className="max-w-3xl mx-auto">
            {/* Ограничение отображаемых сообщений для оптимизации памяти на мобильных */}
            {messages.length > 100 && (
              <div className="text-center text-xs text-gray-500 dark:text-gray-400 mb-2 py-2">
                {t.showingRecentMessages || 'Showing recent messages'} ({messages.length - 100} {t.hidden || 'hidden'})
              </div>
            )}
            {displayedMessages.map((msg) => (
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
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="flex-shrink-0 p-3 sm:p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
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
              onFocus={(e) => {
                // Автоматическая прокрутка к input при фокусе на мобильных устройствах
                // Задержка для появления клавиатуры
                setTimeout(() => {
                  e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
              }}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className={`min-h-[44px] min-w-[44px] sm:p-2 p-3 rounded-xl transition-all duration-200 flex items-center justify-center flex-shrink-0
                ${!inputText.trim() || isLoading 
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                  : 'bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600 shadow-md hover:shadow-lg active:scale-95'
                }`}
              aria-label={t.sendMessage || 'Send message'}
            >
              {isLoading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Send className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
            {t.chatDisclaimer}
          </p>
        </div>
      </div>

      {/* Clear Chat Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6 border-2 border-yellow-200 dark:border-yellow-800">
            <div className="flex flex-col items-center mb-4 sm:mb-6">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400 rounded-xl flex items-center justify-center mb-3">
                <Trash2 size={24} />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                {t.clearChat || 'Clear Chat'}
              </h2>
              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 text-center">
                {t.clearChatConfirm || 'Are you sure you want to clear all chat history? This action cannot be undone.'}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-6 py-2.5 rounded-lg font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                {t.cancel || 'Cancel'}
              </button>
              <button
                onClick={handleClearChat}
                className="px-6 py-2.5 rounded-lg font-medium text-white bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 transition-all shadow-md"
              >
                {t.confirm || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Course Details Modal with Registration */}
      <CourseDetailsModal
        course={selectedCourse}
        isOpen={!!selectedCourse}
        onClose={() => setSelectedCourse(null)}
        language={language}
        queueLength={selectedCourse ? (courseQueues.get(selectedCourse.id) || 0) : 0}
        isRegistered={selectedCourse ? registrations.includes(selectedCourse.id) : false}
        onRegister={handleRegisterCourse}
        isLoading={isRegistering}
      />
    </div>
  );
});

ChatInterface.displayName = 'ChatInterface';

export default ChatInterface;