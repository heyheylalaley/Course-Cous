import { createClient } from '@supabase/supabase-js';
import { Registration, UserProfile, EnglishLevel, CourseQueue, AdminCourseStats, AdminStudentDetail, Course, Message, Language } from '../types';
import { AVAILABLE_COURSES } from '../constants';
import { translateCourse } from './translateService';

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Initialize Supabase client
export const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

// --- MOCK DATABASE IMPLEMENTATION (Local Storage) ---
// This ensures the app works immediately for the demo without API keys.

const STORAGE_KEYS = {
  SESSION: 'auth_session',
  PROFILE: (userId: string) => `user_profile_${userId}`,
  REGISTRATIONS: (userId: string) => `user_registrations_${userId}`,
  COURSE_QUEUES: 'course_queues' // global queue for all courses
};

export const db = {
  // --- Auth Methods ---
  signIn: async (email: string, password?: string): Promise<{ user: { id: string, email: string } | null, error: string | null }> => {
    if (!supabase) {
      // Fallback to mock if Supabase not configured
      if (!email.includes('@')) return { user: null, error: 'Invalid email' };
      const mockUser = { id: btoa(email), email };
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(mockUser));
      return { user: mockUser, error: null };
    }

    try {
      // Require password for login (no magic link to avoid email sending)
      if (!password) {
        return { user: null, error: 'Password is required for login' };
      }

      // Password authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) return { user: null, error: error.message };
      return { user: { id: data.user.id, email: data.user.email! }, error: null };
    } catch (error: any) {
      return { user: null, error: error.message || 'Authentication failed' };
    }
  },

  signUp: async (email: string, password?: string): Promise<{ user: { id: string, email: string } | null, error: string | null }> => {
    if (!supabase) {
      // Fallback to mock
      return db.signIn(email, password);
    }

    try {
      // Require password for signup (no magic link to avoid email sending)
      if (!password) {
        return { user: null, error: 'Password is required for registration' };
      }

      // Signup with password (no emailRedirectTo to avoid email sending when confirmation is disabled)
      const { data, error } = await supabase.auth.signUp({
        email,
        password
        // Removed emailRedirectTo to prevent email sending when email confirmation is disabled
      });

      if (error) return { user: null, error: error.message };
      
      // If email confirmation is disabled, user should be logged in immediately
      if (data.user && data.session) {
        return { user: { id: data.user.id, email: data.user.email! }, error: null };
      }

      // If email confirmation is required (shouldn't happen if disabled in settings)
      if (data.user && !data.session) {
        return { user: null, error: 'Please check your email to confirm your account' };
      }

      return { user: null, error: 'Registration failed' };
    } catch (error: any) {
      return { user: null, error: error.message || 'Registration failed' };
    }
  },

  signInWithGoogle: async (): Promise<{ error: string | null }> => {
    if (!supabase) {
      return { error: 'Supabase is not configured' };
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/Course-Cous/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) return { error: error.message };
      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Google sign-in failed' };
    }
  },

  signOut: async () => {
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    }
  },

  getCurrentSession: () => {
    if (supabase) {
      // Try to get session from localStorage (Supabase stores it there)
      // This is a synchronous check for immediate access
      try {
        // Supabase stores session in localStorage with a specific key pattern
        const storageKeys = Object.keys(localStorage);
        const supabaseKey = storageKeys.find(key => 
          key.includes('supabase.auth.token') || 
          key.includes('sb-') && key.includes('auth-token')
        );
        
        if (supabaseKey) {
          const stored = localStorage.getItem(supabaseKey);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              // Check different possible structures
              const session = parsed?.currentSession || parsed?.session || parsed;
              if (session?.user) {
                return { id: session.user.id, email: session.user.email };
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      } catch (error) {
        // Ignore errors
      }
      return null;
    }
    
    // Mock fallback
    const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse session from localStorage:', e);
      return null;
    }
  },

  // --- Profile Methods ---
  getProfile: async (): Promise<UserProfile> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.id)
        .single();

      if (error) {
        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({ id: session.id, email: session.email, english_level: 'None' })
            .select()
            .single();
          
          if (insertError) throw new Error(insertError.message);
          // Migrate old name format if needed
          let firstName = newProfile.first_name;
          let lastName = newProfile.last_name;
          if (!firstName && !lastName && newProfile.name) {
            const nameParts = newProfile.name.trim().split(/\s+/);
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
          }

          return {
            id: newProfile.id,
            email: newProfile.email,
            englishLevel: newProfile.english_level as EnglishLevel,
            name: newProfile.name,
            firstName: firstName,
            lastName: lastName,
            mobileNumber: newProfile.mobile_number,
            address: newProfile.address,
            eircode: newProfile.eircode,
            dateOfBirth: newProfile.date_of_birth ? new Date(newProfile.date_of_birth).toISOString().split('T')[0] : undefined,
            isAdmin: newProfile.is_admin || false
          };
        }
        throw new Error(error.message);
      }

      // Migrate old name format to firstName/lastName if needed
      let firstName = data.first_name;
      let lastName = data.last_name;
      if (!firstName && !lastName && data.name) {
        // Split name into first and last name
        const nameParts = data.name.trim().split(/\s+/);
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }

      const isAdminValue = data.is_admin === true || data.is_admin === 'true' || data.is_admin === 1;
      // Log only in development mode
      if (import.meta.env.DEV) {
        console.log('Profile loaded:', {
          userId: data.id,
          email: data.email,
          isAdmin: isAdminValue
        });
      }

      return {
        id: data.id,
        email: data.email,
        englishLevel: data.english_level as EnglishLevel,
        name: data.name, // Keep for backward compatibility
        firstName: firstName,
        lastName: lastName,
        mobileNumber: data.mobile_number,
        address: data.address,
        eircode: data.eircode,
        dateOfBirth: data.date_of_birth ? new Date(data.date_of_birth).toISOString().split('T')[0] : undefined,
        isAdmin: isAdminValue
      };
    }
    
    // Mock fallback:
    const key = STORAGE_KEYS.PROFILE(session.id);
    const stored = localStorage.getItem(key);
    if (!stored) {
      return { 
        id: session.id, 
        email: session.email, 
        englishLevel: 'None',
        firstName: undefined,
        lastName: undefined,
        mobileNumber: undefined,
        address: undefined,
        eircode: undefined,
        dateOfBirth: undefined,
        isAdmin: false
      };
    }
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse profile from localStorage:', e);
      return { 
        id: session.id, 
        email: session.email, 
        englishLevel: 'None',
        firstName: undefined,
        lastName: undefined,
        mobileNumber: undefined,
        address: undefined,
        eircode: undefined,
        dateOfBirth: undefined,
        isAdmin: false
      };
    }
  },

  updateEnglishLevel: async (level: EnglishLevel): Promise<void> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    if (supabase) {
      const { error } = await supabase
        .from('profiles')
        .update({ english_level: level })
        .eq('id', session.id);

      if (error) throw new Error(error.message);
      return;
    }

    // Mock fallback:
    const profile = await db.getProfile();
    const updated = { ...profile, englishLevel: level };
    localStorage.setItem(STORAGE_KEYS.PROFILE(session.id), JSON.stringify(updated));
  },

  updateProfileInfo: async (profileData: {
    firstName?: string;
    lastName?: string;
    mobileNumber?: string;
    address?: string;
    eircode?: string;
    dateOfBirth?: string;
  }): Promise<void> => {
    if (!supabase) {
      // Mock fallback:
      const session = db.getCurrentSession();
      if (!session) throw new Error("Not authenticated");
      const profile = await db.getProfile();
      const updated = { 
        ...profile, 
        firstName: profileData.firstName?.trim(),
        lastName: profileData.lastName?.trim(),
        mobileNumber: profileData.mobileNumber?.trim(),
        address: profileData.address?.trim(),
        eircode: profileData.eircode?.trim(),
        dateOfBirth: profileData.dateOfBirth?.trim()
      };
      localStorage.setItem(STORAGE_KEYS.PROFILE(session.id), JSON.stringify(updated));
      return;
    }

    const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !supabaseSession) {
      throw new Error("Not authenticated. Please sign in again.");
    }

    const userId = supabaseSession.user.id;

    const updateData: any = {};
    if (profileData.firstName !== undefined) updateData.first_name = profileData.firstName.trim() || null;
    if (profileData.lastName !== undefined) updateData.last_name = profileData.lastName.trim() || null;
    if (profileData.mobileNumber !== undefined) updateData.mobile_number = profileData.mobileNumber.trim() || null;
    if (profileData.address !== undefined) updateData.address = profileData.address.trim() || null;
    if (profileData.eircode !== undefined) updateData.eircode = profileData.eircode.trim() || null;
    if (profileData.dateOfBirth !== undefined) updateData.date_of_birth = profileData.dateOfBirth.trim() || null;

    const { data: existingProfile, error: selectError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (selectError && selectError.code === 'PGRST116') {
      // Profile doesn't exist, try to insert
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: supabaseSession.user.email || '',
          english_level: 'None',
          ...updateData
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(insertError.message || 'Failed to create profile. Please check your permissions.');
      }
    } else if (selectError) {
      console.error('Select error:', selectError);
      throw new Error(selectError.message || 'Failed to check profile');
    } else {
      // Profile exists, update it
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(updateError.message || 'Failed to update profile. Please check your permissions.');
      }
    }
  },

  updateName: async (name: string): Promise<void> => {
    if (!supabase) {
      // Mock fallback:
      const session = db.getCurrentSession();
      if (!session) throw new Error("Not authenticated");
      const profile = await db.getProfile();
      const updated = { ...profile, name: name.trim() };
      localStorage.setItem(STORAGE_KEYS.PROFILE(session.id), JSON.stringify(updated));
      return;
    }

    // Get current session from Supabase to ensure auth context is correct
    const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !supabaseSession) {
      throw new Error("Not authenticated. Please sign in again.");
    }

    const userId = supabaseSession.user.id;

    // First, try to update existing profile
    const { data: existingProfile, error: selectError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (selectError && selectError.code === 'PGRST116') {
      // Profile doesn't exist, try to insert
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: supabaseSession.user.email || '',
          name: name.trim(),
          english_level: 'None'
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(insertError.message || 'Failed to create profile. Please check your permissions.');
      }
    } else if (selectError) {
      // Other error
      console.error('Select error:', selectError);
      throw new Error(selectError.message || 'Failed to check profile');
    } else {
      // Profile exists, update it
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ name: name.trim() })
        .eq('id', userId);

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(updateError.message || 'Failed to update profile. Please check your permissions.');
      }
    }
  },

  // --- Registration Methods ---
  getRegistrations: async (): Promise<Registration[]> => {
    const session = db.getCurrentSession();
    if (!session) return [];

    if (supabase) {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('user_id', session.id)
        .order('priority', { ascending: true });

      if (error) throw new Error(error.message);
      
      return (data || []).map((r: any) => ({
        courseId: r.course_id,
        registeredAt: new Date(r.registered_at),
        priority: r.priority
      }));
    }

    // Mock fallback:
    const key = STORAGE_KEYS.REGISTRATIONS(session.id);
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    try {
      const regs = JSON.parse(stored);
      const parsed = regs.map((r: any) => ({ ...r, registeredAt: new Date(r.registeredAt) }));
      return parsed.sort((a: Registration, b: Registration) => (a.priority || 999) - (b.priority || 999));
    } catch (e) {
      console.error('Failed to parse registrations from localStorage:', e);
      return [];
    }
  },

  isProfileComplete: async (): Promise<boolean> => {
    const profile = await db.getProfile();
    return !!(
      profile.firstName &&
      profile.firstName.trim() &&
      profile.lastName &&
      profile.lastName.trim() &&
      profile.mobileNumber &&
      profile.mobileNumber.trim() &&
      profile.address &&
      profile.address.trim() &&
      profile.eircode &&
      profile.eircode.trim() &&
      profile.dateOfBirth &&
      profile.dateOfBirth.trim()
    );
  },

  addRegistration: async (courseId: string): Promise<void> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    // Check if profile is complete
    const isComplete = await db.isProfileComplete();
    if (!isComplete) {
      throw new Error('Please complete your profile before registering for courses.');
    }

    // Check if course is already completed - prevent re-registration
    const isCompleted = await db.isUserCourseCompleted(session.id, courseId);
    if (isCompleted) {
      throw new Error('This course has already been completed. You cannot register for it again.');
    }

    if (supabase) {
      // Check current registrations count
      const currentRegs = await db.getRegistrations();
      if (currentRegs.length >= 3) {
        throw new Error('Maximum 3 courses allowed');
      }

      // Check if already registered
      if (currentRegs.find(r => r.courseId === courseId)) {
        return; // Already registered
      }

      const priority = currentRegs.length + 1;
      
      const { error } = await supabase
        .from('registrations')
        .insert({
          user_id: session.id,
          course_id: courseId,
          priority: priority
        });

      if (error) throw new Error(error.message);

      // Increment course queue
      await db.incrementCourseQueue(courseId);
      return;
    }

    // Mock fallback:
    const regs = await db.getRegistrations();
    if (regs.length >= 3) {
      throw new Error('Maximum 3 courses allowed');
    }
    if (!regs.find(r => r.courseId === courseId)) {
        const priority = regs.length + 1;
        regs.push({ courseId, registeredAt: new Date(), priority });
        localStorage.setItem(STORAGE_KEYS.REGISTRATIONS(session.id), JSON.stringify(regs));
        db.incrementCourseQueue(courseId);
    }
  },

  removeRegistration: async (courseId: string): Promise<void> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    if (supabase) {
      const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('user_id', session.id)
        .eq('course_id', courseId);

      if (error) throw new Error(error.message);

      // Recalculate priorities for remaining registrations
      const remainingRegs = await db.getRegistrations();
      for (let i = 0; i < remainingRegs.length; i++) {
        await supabase
          .from('registrations')
          .update({ priority: i + 1 })
          .eq('user_id', session.id)
          .eq('course_id', remainingRegs[i].courseId);
      }
      return;
    }

    // Mock fallback:
    const regs = await db.getRegistrations();
    const filtered = regs.filter(r => r.courseId !== courseId);
    const updated = filtered.map((r, index) => ({ ...r, priority: index + 1 }));
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS(session.id), JSON.stringify(updated));
    db.decrementCourseQueue(courseId);
  },

  updateRegistrationPriority: async (courseId: string, newPriority: number): Promise<void> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    if (supabase) {
      const regs = await db.getRegistrations();
      if (newPriority < 1 || newPriority > regs.length) {
        throw new Error("Invalid priority");
      }

      const courseIndex = regs.findIndex(r => r.courseId === courseId);
      if (courseIndex === -1) return;

      // Get all registrations and reorder
      const [moved] = regs.splice(courseIndex, 1);
      regs.splice(newPriority - 1, 0, moved);

      // Update all priorities in database
      for (let i = 0; i < regs.length; i++) {
        const { error } = await supabase
          .from('registrations')
          .update({ priority: i + 1 })
          .eq('user_id', session.id)
          .eq('course_id', regs[i].courseId);

        if (error) throw new Error(error.message);
      }
      return;
    }

    // Mock fallback:
    const regs = await db.getRegistrations();
    if (newPriority < 1 || newPriority > regs.length) {
      throw new Error("Invalid priority");
    }

    const courseIndex = regs.findIndex(r => r.courseId === courseId);
    if (courseIndex === -1) return;

    const [moved] = regs.splice(courseIndex, 1);
    regs.splice(newPriority - 1, 0, moved);
    
    const updated = regs.map((r, index) => ({ ...r, priority: index + 1 }));
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS(session.id), JSON.stringify(updated));
  },

  // --- Course Queue Methods ---
  getCourseQueues: async (): Promise<CourseQueue[]> => {
    if (supabase) {
      // Try to use the database function first (bypasses RLS)
      // Note: Function may not exist - we'll silently fallback to direct query
      const { data: queueData, error: functionError } = await supabase
        .rpc('get_course_queue_counts');

      // Check if function exists and worked (ignore 404/PGRST202 errors - function doesn't exist)
      if (!functionError && queueData) {
        // Function worked, use the results
        const queueCounts = new Map<string, number>();
        (queueData || []).forEach((q: any) => {
          queueCounts.set(q.course_id, Number(q.queue_length) || 0);
        });

        // Get courses from database to build queue list
        const { data: coursesData } = await supabase
          .from('courses')
          .select('id')
          .eq('is_active', true);

        const courseIds = coursesData ? coursesData.map((c: any) => c.id) : [];
        const queues: CourseQueue[] = courseIds.map((courseId: string) => ({
          courseId,
          queueLength: queueCounts.get(courseId) || 0
        }));

        return queues;
      }
      
      // Function doesn't exist (404/PGRST202) or failed - silently fallback to direct query

      // Fallback: try to get all registrations (may fail due to RLS)
      // Silently fallback - function may not exist or user may not be authenticated
      const { data: registrations, error } = await supabase
        .from('registrations')
        .select('course_id');

      if (error) {
        // If RLS blocks (user not authenticated), return empty queues silently
        if (error.code === 'PGRST301' || error.message?.includes('authentication') || error.message?.includes('permission')) {
          const { data: coursesData } = await supabase
            .from('courses')
            .select('id')
            .eq('is_active', true);
          
          const courseIds = coursesData ? coursesData.map((c: any) => c.id) : [];
          return courseIds.map((courseId: string) => ({
            courseId,
            queueLength: 0
          }));
        }
        // Only log unexpected errors
        console.error('Error fetching registrations for queue:', error);
        // If RLS blocks, try to get courses from database
        const { data: coursesData } = await supabase
          .from('courses')
          .select('id')
          .eq('is_active', true);
        
        const courseIds = coursesData ? coursesData.map((c: any) => c.id) : [];
        return courseIds.map((courseId: string) => ({
          courseId,
          queueLength: 0
        }));
      }

      // Count registrations per course
      const queueCounts = new Map<string, number>();
      (registrations || []).forEach((reg: any) => {
        const courseId = reg.course_id;
        queueCounts.set(courseId, (queueCounts.get(courseId) || 0) + 1);
      });

      // Get all course IDs from database
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id')
        .eq('is_active', true);
      
      const courseIds = coursesData ? coursesData.map((c: any) => c.id) : [];
      const queues: CourseQueue[] = courseIds.map((courseId: string) => ({
        courseId,
        queueLength: queueCounts.get(courseId) || 0
      }));

        return queues;
    }

    // Mock fallback: Count from all registrations in localStorage
    const allRegs: Registration[] = [];
    // Get all user sessions from localStorage
    const sessionKeys = Object.keys(localStorage).filter(key => key.startsWith('auth_session') || key.includes('user_profile_'));
    
    // Try to get registrations from all possible users
    for (const key of Object.keys(localStorage)) {
      if (key.includes('user_registrations_')) {
        try {
          const storedRegs = localStorage.getItem(key);
          if (storedRegs) {
            const regs = JSON.parse(storedRegs);
            allRegs.push(...regs);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    // Count registrations per course
    const queueCounts = new Map<string, number>();
    allRegs.forEach(reg => {
      queueCounts.set(reg.courseId, (queueCounts.get(reg.courseId) || 0) + 1);
    });

    // Get all course IDs from constants
    const queues: CourseQueue[] = AVAILABLE_COURSES.map(course => ({
      courseId: course.id,
      queueLength: queueCounts.get(course.id) || 0
    }));

    return queues;
  },

  getCourseQueueLength: (courseId: string): number => {
    // For synchronous access, use cached queues
    // This will be updated when getCourseQueues is called
    if (supabase) {
      // Try to get from cache first
      const cacheKey = `course_queue_${courseId}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        return parseInt(cached, 10) || 0;
      }
      return 0; // Return 0 if not cached yet
    }

    // Mock fallback:
    const stored = localStorage.getItem(STORAGE_KEYS.COURSE_QUEUES);
    if (!stored) return 0;
    try {
      const queues: CourseQueue[] = JSON.parse(stored);
      const queue = queues.find(q => q.courseId === courseId);
      return queue?.queueLength || 0;
    } catch (e) {
      console.error('Failed to parse course queues from localStorage:', e);
      return 0;
    }
  },

  // Async version for loading queues
  loadCourseQueues: async (): Promise<void> => {
    if (supabase) {
      const queues = await db.getCourseQueues();
      // Cache in sessionStorage for synchronous access
      queues.forEach(q => {
        sessionStorage.setItem(`course_queue_${q.courseId}`, q.queueLength.toString());
      });
    }
  },

  incrementCourseQueue: async (courseId: string): Promise<void> => {
    if (supabase) {
      // Use RPC or upsert to increment
      const { data: current } = await supabase
        .from('course_queues')
        .select('queue_length')
        .eq('course_id', courseId)
        .single();

      const newLength = (current?.queue_length || 0) + 1;

      const { error } = await supabase
        .from('course_queues')
        .upsert({
          course_id: courseId,
          queue_length: newLength
        }, {
          onConflict: 'course_id'
        });

      if (error) {
        // Only log in dev mode - RLS errors are expected if policies aren't set up
        if (import.meta.env.DEV) {
          console.error('Error incrementing queue:', error);
        }
        return;
      }

      // Update cache
      sessionStorage.setItem(`course_queue_${courseId}`, newLength.toString());
      return;
    }

    // Mock fallback:
    const queues = await db.getCourseQueues();
    const queue = queues.find(q => q.courseId === courseId);
    if (queue) {
      queue.queueLength += 1;
    } else {
      queues.push({ courseId, queueLength: 1 });
    }
    localStorage.setItem(STORAGE_KEYS.COURSE_QUEUES, JSON.stringify(queues));
  },

  decrementCourseQueue: async (courseId: string): Promise<void> => {
    if (supabase) {
      const { data: current } = await supabase
        .from('course_queues')
        .select('queue_length')
        .eq('course_id', courseId)
        .single();

      if (!current) return;

      const newLength = Math.max(0, (current.queue_length || 0) - 1);

      const { error } = await supabase
        .from('course_queues')
        .update({ queue_length: newLength })
        .eq('course_id', courseId);

      if (error) {
        console.error('Error decrementing queue:', error);
        return;
      }

      // Update cache
      sessionStorage.setItem(`course_queue_${courseId}`, newLength.toString());
      return;
    }

    // Mock fallback:
    const queues = await db.getCourseQueues();
    const queue = queues.find(q => q.courseId === courseId);
    if (queue && queue.queueLength > 0) {
      queue.queueLength -= 1;
      localStorage.setItem(STORAGE_KEYS.COURSE_QUEUES, JSON.stringify(queues));
    }
  },

  // Listen to auth state changes
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    if (supabase) {
      return supabase.auth.onAuthStateChange(callback);
    }
    return { data: { subscription: null }, unsubscribe: () => {} };
  },

  // --- Admin Methods ---
  getAdminCourseStats: async (): Promise<AdminCourseStats[]> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    // Check if user is admin
    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      // Get registration counts per course
      const { data: registrations, error } = await supabase
        .from('registrations')
        .select('course_id');

      if (error) throw new Error(error.message);

      // Count registrations per course
      const courseCounts = new Map<string, number>();
      (registrations || []).forEach((reg: any) => {
        const courseId = reg.course_id;
        courseCounts.set(courseId, (courseCounts.get(courseId) || 0) + 1);
      });

      // Get courses from database directly (to avoid recursion)
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, title')
        .order('title', { ascending: true });

      if (coursesError) throw new Error(coursesError.message);

      // Map to AdminCourseStats with course titles
      return (coursesData || []).map((c: any) => ({
        courseId: c.id,
        courseTitle: c.title,
        registrantCount: courseCounts.get(c.id) || 0
      }));
    }

    // Mock fallback:
    const queues = await db.getCourseQueues();
    return AVAILABLE_COURSES.map(course => ({
      courseId: course.id,
      courseTitle: course.title,
      registrantCount: queues.find(q => q.courseId === course.id)?.queueLength || 0
    }));
  },

  // Get all registrations (admin only)
  getAllRegistrations: async (): Promise<Registration[]> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('registered_at', { ascending: false });

      if (error) throw new Error(error.message);

      return (data || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        courseId: r.course_id,
        priority: r.priority,
        registeredAt: new Date(r.registered_at)
      }));
    }

    return [];
  },

  // Get all profiles (admin only)
  getAllProfiles: async (): Promise<UserProfile[]> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      return (data || []).map((p: any) => {
        // Migrate old name format if needed
        let firstName = p.first_name;
        let lastName = p.last_name;
        if (!firstName && !lastName && p.name) {
          const nameParts = p.name.trim().split(/\s+/);
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        }

        return {
          id: p.id,
          email: p.email,
          englishLevel: (p.english_level as EnglishLevel) || 'None',
          name: p.name,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          mobileNumber: p.mobile_number || undefined,
          address: p.address || undefined,
          eircode: p.eircode || undefined,
          dateOfBirth: p.date_of_birth ? new Date(p.date_of_birth).toISOString().split('T')[0] : undefined,
          isAdmin: p.is_admin || false
        };
      });
    }

    return [];
  },

  // Get all users with registrations and completions (admin only)
  getAllUsersWithDetails: async (): Promise<Array<{
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    mobileNumber?: string;
    address?: string;
    eircode?: string;
    dateOfBirth?: string;
    englishLevel: EnglishLevel;
    isAdmin?: boolean;
    createdAt?: Date;
    registeredCourses: string[];
    completedCourses: string[];
    isProfileComplete: boolean;
  }>> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw new Error(profilesError.message);

      // Get all registrations
      const { data: registrations, error: regError } = await supabase
        .from('registrations')
        .select('user_id, course_id');

      if (regError) throw new Error(regError.message);

      // Get all completions
      const { data: completions, error: compError } = await supabase
        .from('course_completions')
        .select('user_id, course_id');

      // Build maps for quick lookup
      const registrationsMap = new Map<string, string[]>();
      (registrations || []).forEach((r: any) => {
        if (!registrationsMap.has(r.user_id)) {
          registrationsMap.set(r.user_id, []);
        }
        registrationsMap.get(r.user_id)!.push(r.course_id);
      });

      const completionsMap = new Map<string, string[]>();
      (completions || []).forEach((c: any) => {
        if (!completionsMap.has(c.user_id)) {
          completionsMap.set(c.user_id, []);
        }
        completionsMap.get(c.user_id)!.push(c.course_id);
      });

      return (profiles || []).map((p: any) => {
        let firstName = p.first_name;
        let lastName = p.last_name;
        if (!firstName && !lastName && p.name) {
          const nameParts = p.name.trim().split(/\s+/);
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        }

        const isProfileComplete = !!(
          firstName && firstName.trim() &&
          lastName && lastName.trim() &&
          p.mobile_number && p.mobile_number.trim() &&
          p.address && p.address.trim() &&
          p.eircode && p.eircode.trim() &&
          p.date_of_birth
        );

        return {
          userId: p.id,
          email: p.email,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          mobileNumber: p.mobile_number || undefined,
          address: p.address || undefined,
          eircode: p.eircode || undefined,
          dateOfBirth: p.date_of_birth ? new Date(p.date_of_birth).toISOString().split('T')[0] : undefined,
          englishLevel: (p.english_level as EnglishLevel) || 'None',
          isAdmin: p.is_admin || false,
          createdAt: p.created_at ? new Date(p.created_at) : undefined,
          registeredCourses: registrationsMap.get(p.id) || [],
          completedCourses: completionsMap.get(p.id) || [],
          isProfileComplete
        };
      });
    }

    return [];
  },

  getAdminStudentDetails: async (courseId: string): Promise<AdminStudentDetail[]> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    // Check if user is admin
    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      // Get all registrations for this course with user profiles
      const { data: registrations, error: regError } = await supabase
        .from('registrations')
        .select('user_id, registered_at, priority')
        .eq('course_id', courseId)
        .order('registered_at', { ascending: true });

      if (regError) throw new Error(regError.message);

      if (!registrations || registrations.length === 0) {
        return [];
      }

      // Get user IDs
      const userIds = registrations.map((r: any) => r.user_id);

      // Get profiles for these users
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profileError) {
        console.error('Error fetching profiles:', profileError);
        throw new Error(profileError.message);
      }

      // Log only in development mode
      if (import.meta.env.DEV) {
        console.log(`Fetched ${profiles?.length || 0} profiles`);
      }

      // Combine registration and profile data
      const details: AdminStudentDetail[] = (registrations || []).map((reg: any) => {
        const profile = (profiles || []).find((p: any) => p.id === reg.user_id);
        
        console.log(`Processing registration for user ${reg.user_id}:`, {
          hasProfile: !!profile,
          profileData: profile
        });
        
        // Migrate old name format if needed
        let firstName = profile?.first_name;
        let lastName = profile?.last_name;
        if (!firstName && !lastName && profile?.name) {
          const nameParts = profile.name.trim().split(/\s+/);
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        }

        return {
          userId: reg.user_id,
          email: profile?.email || '',
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          mobileNumber: profile?.mobile_number || undefined,
          address: profile?.address || undefined,
          eircode: profile?.eircode || undefined,
          dateOfBirth: profile?.date_of_birth ? new Date(profile.date_of_birth).toISOString().split('T')[0] : undefined,
          englishLevel: (profile?.english_level as EnglishLevel) || 'None',
          registeredAt: new Date(reg.registered_at),
          priority: reg.priority || 999
        };
      });

      return details.sort((a, b) => (a.priority || 999) - (b.priority || 999));
    }

    // Mock fallback:
    const regs = await db.getRegistrations();
    const courseRegs = regs.filter(r => r.courseId === courseId);
    return courseRegs.map(reg => {
      // In mock mode, we don't have full profile data, so return minimal info
      const session = db.getCurrentSession();
      return {
        userId: session?.id || '',
        email: session?.email || '',
        firstName: undefined,
        lastName: undefined,
        mobileNumber: undefined,
        address: undefined,
        eircode: undefined,
        dateOfBirth: undefined,
        englishLevel: 'None' as EnglishLevel,
        registeredAt: reg.registeredAt,
        priority: reg.priority || 999
      };
    });
  },

  // --- Course Management Methods (Admin only) ---
  getAllCourses: async (includeInactive: boolean = false, language: Language = 'en'): Promise<Course[]> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    if (supabase) {
      let query = supabase
        .from('courses')
        .select('*')
        .order('title', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);

      // Load translations for all courses at once
      const courseIds = (data || []).map((c: any) => c.id);
      let translationsMap: Record<string, Record<string, { title: string | null; description: string }>> = {};
      
      if (courseIds.length > 0 && language !== 'en') {
        try {
          const { data: translationsData, error: translationsError } = await supabase
            .from('course_translations')
            .select('course_id, language, title, description')
            .in('course_id', courseIds)
            .eq('language', language);

          if (!translationsError && translationsData) {
            translationsData.forEach((t: any) => {
              if (!translationsMap[t.course_id]) {
                translationsMap[t.course_id] = {};
              }
              translationsMap[t.course_id][t.language] = {
                title: t.title,
                description: t.description
              };
            });
          }
        } catch (translationError) {
          console.error('Failed to load translations:', translationError);
        }
      }

      const courses = (data || []).map((c: any) => {
        const translation = translationsMap[c.id]?.[language];
        return {
          id: c.id,
          title: c.title, // Always use original title, never translated
          category: c.category,
          description: translation?.description || c.description,
          difficulty: c.difficulty as 'Beginner' | 'Intermediate' | 'Advanced',
          link: c.link,
          minEnglishLevel: c.min_english_level as EnglishLevel | undefined,
          isActive: c.is_active,
          createdAt: c.created_at ? new Date(c.created_at) : undefined,
          updatedAt: c.updated_at ? new Date(c.updated_at) : undefined
        };
      });

      // CRITICAL: Double-check filter - never return inactive courses if includeInactive is false
      if (!includeInactive) {
        const filtered = courses.filter(c => c.isActive !== false);
        const removed = courses.length - filtered.length;
        if (removed > 0) {
          console.warn(`[DB] Filtered out ${removed} inactive course(s) from getAllCourses:`, 
            courses.filter(c => c.isActive === false).map(c => c.title));
        }
        return filtered;
      }

      return courses;
    }

    // Mock fallback: return from constants
    return AVAILABLE_COURSES;
  },

  // Public method to get active courses (for bot, doesn't require admin)
  getActiveCourses: async (language: Language = 'en'): Promise<Course[]> => {
    // Try to use authenticated method first
    const session = db.getCurrentSession();
    if (session) {
      try {
        return await db.getAllCourses(false, language);
      } catch (error) {
        console.error('Failed to get courses with auth, trying public access:', error);
      }
    }

    // If no session or error, try public access (RLS should allow reading active courses)
    if (supabase) {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .order('title', { ascending: true });

      if (error) {
        console.error('Failed to get active courses:', error);
        return [];
      }

      // Load translations for all courses at once
      const courseIds = (data || []).map((c: any) => c.id);
      let translationsMap: Record<string, Record<string, { title: string | null; description: string }>> = {};
      
      if (courseIds.length > 0 && language !== 'en') {
        try {
          const { data: translationsData, error: translationsError } = await supabase
            .from('course_translations')
            .select('course_id, language, title, description')
            .in('course_id', courseIds)
            .eq('language', language);

          if (!translationsError && translationsData) {
            translationsData.forEach((t: any) => {
              if (!translationsMap[t.course_id]) {
                translationsMap[t.course_id] = {};
              }
              translationsMap[t.course_id][t.language] = {
                title: t.title,
                description: t.description
              };
            });
          }
        } catch (translationError) {
          console.error('Failed to load translations:', translationError);
        }
      }

      return (data || []).map((c: any) => {
        const translation = translationsMap[c.id]?.[language];
        return {
          id: c.id,
          title: c.title, // Always use original title, never translated
          category: c.category,
          description: translation?.description || c.description,
          difficulty: c.difficulty as 'Beginner' | 'Intermediate' | 'Advanced',
          link: c.link,
          minEnglishLevel: c.min_english_level as EnglishLevel | undefined,
          isActive: c.is_active,
          createdAt: c.created_at ? new Date(c.created_at) : undefined,
          updatedAt: c.updated_at ? new Date(c.updated_at) : undefined
        };
      }).filter(c => c.isActive !== false); // Double-check filter
    }

    // No fallback - return empty to prevent showing inactive courses
    return [];
  },

  createCourse: async (course: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>): Promise<Course> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    // Check if user is admin
    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      // Generate ID if not provided
      const courseId = `c${Date.now()}`;
      
      const { data, error } = await supabase
        .from('courses')
        .insert({
          id: courseId,
          title: course.title,
          category: course.category,
          description: course.description,
          difficulty: course.difficulty,
          link: course.link || '#',
          min_english_level: course.minEnglishLevel || null,
          is_active: course.isActive !== false
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Translate course to all languages
      try {
        const translations = await translateCourse(
          data.id,
          course.title,
          course.description,
          'en' // Assuming courses are created in English
        );

        // Save translations to database (title is always null since we don't translate it)
        const translationPromises = Object.entries(translations).map(([lang, trans]) =>
          db.saveCourseTranslation(data.id, lang as 'en' | 'ua' | 'ru' | 'ar', null, trans.description)
        );
        await Promise.all(translationPromises);
      } catch (translationError: any) {
        console.error('[DB] Failed to translate course:', translationError);
        console.error('[DB] Translation error details:', translationError?.message || translationError);
        // Don't fail course creation if translation fails
      }

      return {
        id: data.id,
        title: data.title,
        category: data.category,
        description: data.description,
        difficulty: data.difficulty as 'Beginner' | 'Intermediate' | 'Advanced',
        link: data.link,
        minEnglishLevel: data.min_english_level as EnglishLevel | undefined,
        isActive: data.is_active,
        createdAt: data.created_at ? new Date(data.created_at) : undefined,
        updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
      };
    }

    throw new Error("Supabase not configured");
  },

  updateCourse: async (courseId: string, updates: Partial<Omit<Course, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Course> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    // Check if user is admin
    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      const updateData: any = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.difficulty !== undefined) updateData.difficulty = updates.difficulty;
      if (updates.link !== undefined) updateData.link = updates.link;
      if (updates.minEnglishLevel !== undefined) updateData.min_english_level = updates.minEnglishLevel || null;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { data, error } = await supabase
        .from('courses')
        .update(updateData)
        .eq('id', courseId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // If description was updated, retranslate (title is never translated)
      if (updates.description !== undefined) {
        try {
          const title = data.title; // Use original title (never translate)
          const description = updates.description || data.description;
          
          const translations = await translateCourse(
            courseId,
            title,
            description,
            'en' // Assuming courses are updated in English
          );

          // Save translations to database (title is always null since we don't translate it)
          const translationPromises = Object.entries(translations).map(([lang, trans]) =>
            db.saveCourseTranslation(courseId, lang as 'en' | 'ua' | 'ru' | 'ar', null, trans.description)
          );
          await Promise.all(translationPromises);
        } catch (translationError) {
          console.error('Failed to retranslate course:', translationError);
          // Don't fail course update if translation fails
        }
      }

      return {
        id: data.id,
        title: data.title,
        category: data.category,
        description: data.description,
        difficulty: data.difficulty as 'Beginner' | 'Intermediate' | 'Advanced',
        link: data.link,
        minEnglishLevel: data.min_english_level as EnglishLevel | undefined,
        isActive: data.is_active,
        createdAt: data.created_at ? new Date(data.created_at) : undefined,
        updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
      };
    }

    throw new Error("Supabase not configured");
  },

  deleteCourse: async (courseId: string): Promise<void> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    // Check if user is admin
    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      // Check if there are registrations for this course
      const { data: registrations, error: regError } = await supabase
        .from('registrations')
        .select('id')
        .eq('course_id', courseId)
        .limit(1);

      if (regError) throw new Error(regError.message);

      if (registrations && registrations.length > 0) {
        // Instead of deleting, deactivate the course
        await db.updateCourse(courseId, { isActive: false });
        return;
      }

      // If no registrations, delete the course
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw new Error(error.message);
      return;
    }

    throw new Error("Supabase not configured");
  },

  // --- Chat History Methods ---
  saveChatMessage: async (role: 'user' | 'model', content: string): Promise<void> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    if (supabase) {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: session.id,
          role,
          content,
          timestamp: new Date().toISOString()
        });

      if (error) throw new Error(error.message);
      return;
    }

    // Mock fallback: save to localStorage
    const storageKey = `chat_messages_${session.id}`;
    try {
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.push({
        id: Date.now().toString(),
        role,
        content,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem(storageKey, JSON.stringify(existing));
    } catch (e) {
      console.error('Failed to save chat message to localStorage:', e);
    }
  },

  getChatHistory: async (): Promise<Message[]> => {
    const session = db.getCurrentSession();
    if (!session) return [];

    if (supabase) {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', session.id)
        .order('timestamp', { ascending: true });

      if (error) throw new Error(error.message);

      return (data || []).map((msg: any) => ({
        id: msg.id,
        role: msg.role as 'user' | 'model',
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      }));
    }

    // Mock fallback: load from localStorage
    const storageKey = `chat_messages_${session.id}`;
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];

    try {
      const messages = JSON.parse(stored);
      return messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role as 'user' | 'model',
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      }));
    } catch (e) {
      console.error('Failed to parse chat messages from localStorage:', e);
      return [];
    }
  },

  clearChatHistory: async (): Promise<void> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    if (supabase) {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', session.id);

      if (error) throw new Error(error.message);
      return;
    }

    // Mock fallback: clear from localStorage
    const storageKey = `chat_messages_${session.id}`;
    localStorage.removeItem(storageKey);
  },

  // --- Course Translation Methods ---
  saveCourseTranslation: async (courseId: string, language: 'en' | 'ua' | 'ru' | 'ar', title: string | null, description: string): Promise<void> => {
    // Log only in development mode
    if (import.meta.env.DEV) {
      console.log(`[DB] Saving translation for ${courseId}/${language}`);
    }
    
    if (!supabase) {
      // Mock fallback: save to localStorage
      const storageKey = `course_translations_${courseId}_${language}`;
      localStorage.setItem(storageKey, JSON.stringify({ courseId, language, title, description }));
      return;
    }

    const { error } = await supabase
      .from('course_translations')
      .upsert({
        course_id: courseId,
        language: language,
        title,
        description: description,
        translated_at: new Date().toISOString()
      }, {
        onConflict: 'course_id,language'
      });

    if (error) {
      console.error(`[DB] Error saving translation for ${courseId}/${language}:`, error);
      throw new Error(error.message);
    }
  },

  getCourseTranslation: async (courseId: string, language: 'en' | 'ua' | 'ru' | 'ar'): Promise<{ title: string | null; description: string } | null> => {
    if (!supabase) {
      // Mock fallback: load from localStorage
      const storageKey = `course_translations_${courseId}_${language}`;
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;
      try {
        const data = JSON.parse(stored);
        return { title: data.title, description: data.description };
      } catch (e) {
        console.error('Failed to parse course translation from localStorage:', e);
        return null;
      }
    }

    const { data, error } = await supabase
      .from('course_translations')
      .select('title, description')
      .eq('course_id', courseId)
      .eq('language', language)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw new Error(error.message);
    }

    return data ? { title: data.title, description: data.description } : null;
  },

  getAllCourseTranslations: async (courseId: string): Promise<Record<string, { title: string | null; description: string }>> => {
    if (!supabase) {
      // Mock fallback: load all from localStorage
      const languages: ('en' | 'ua' | 'ru' | 'ar')[] = ['en', 'ua', 'ru', 'ar'];
      const translations: Record<string, { title: string | null; description: string }> = {};
      
      for (const lang of languages) {
        const storageKey = `course_translations_${courseId}_${lang}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          try {
            const data = JSON.parse(stored);
            translations[lang] = { title: data.title, description: data.description };
          } catch (e) {
            console.error(`Failed to parse translation for ${lang} from localStorage:`, e);
          }
        }
      }
      
      return translations;
    }

    const { data, error } = await supabase
      .from('course_translations')
      .select('language, title, description')
      .eq('course_id', courseId);

    if (error) throw new Error(error.message);

    const translations: Record<string, { title: string | null; description: string }> = {};
    (data || []).forEach((t: any) => {
      translations[t.language] = { title: t.title, description: t.description };
    });

    return translations;
  },

  deleteCourseTranslations: async (courseId: string): Promise<void> => {
    if (!supabase) {
      // Mock fallback: delete from localStorage
      const languages: ('en' | 'ua' | 'ru' | 'ar')[] = ['en', 'ua', 'ru', 'ar'];
      languages.forEach(lang => {
        const storageKey = `course_translations_${courseId}_${lang}`;
        localStorage.removeItem(storageKey);
      });
      return;
    }

    const { error } = await supabase
      .from('course_translations')
      .delete()
      .eq('course_id', courseId);

    if (error) throw new Error(error.message);
  },

  // --- Bot Instructions Methods ---
  getBotInstructions: async (section: string = 'main', language: Language = 'en'): Promise<string> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('bot_instructions')
        .select('content')
        .eq('section', section)
        .eq('language', language)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(error.message);
      }

      return data?.content || '';
    }

    // Mock fallback
    return '';
  },

  getAllBotInstructions: async (): Promise<Array<{ section: string; content: string; language: Language }>> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('bot_instructions')
        .select('section, content, language')
        .order('section', { ascending: true })
        .order('language', { ascending: true });

      if (error) throw new Error(error.message);
      return (data || []).map((item: any) => ({
        section: item.section,
        content: item.content,
        language: item.language as Language
      }));
    }

    return [];
  },

  saveBotInstruction: async (section: string, content: string, language: Language = 'en'): Promise<void> => {
    if (supabase) {
      const { error } = await supabase
        .from('bot_instructions')
        .upsert({
          section,
          content,
          language
        }, {
          onConflict: 'section,language'
        });

      if (error) throw new Error(error.message);
      return;
    }

    // Mock fallback
    const storageKey = `bot_instruction_${section}_${language}`;
    localStorage.setItem(storageKey, content);
  },

  // --- Course Completion Methods (Admin only) ---
  markCourseCompleted: async (userId: string, courseId: string): Promise<void> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    // Check if user is admin
    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      const { error } = await supabase
        .from('course_completions')
        .insert({
          user_id: userId,
          course_id: courseId,
          marked_by: session.id
        });

      if (error) {
        // If already exists, ignore
        if (error.code === '23505') return;
        throw new Error(error.message);
      }

      // Also remove the user's registration for this course
      await supabase
        .from('registrations')
        .delete()
        .eq('user_id', userId)
        .eq('course_id', courseId);
      
      return;
    }

    // Mock fallback
    const storageKey = `course_completion_${userId}_${courseId}`;
    localStorage.setItem(storageKey, JSON.stringify({
      userId,
      courseId,
      completedAt: new Date().toISOString(),
      markedBy: session.id
    }));
  },

  unmarkCourseCompleted: async (userId: string, courseId: string): Promise<void> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    // Check if user is admin
    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      const { error } = await supabase
        .from('course_completions')
        .delete()
        .eq('user_id', userId)
        .eq('course_id', courseId);

      if (error) throw new Error(error.message);
      return;
    }

    // Mock fallback
    const storageKey = `course_completion_${userId}_${courseId}`;
    localStorage.removeItem(storageKey);
  },

  getUserCompletedCourses: async (userId?: string): Promise<Array<{ courseId: string; completedAt: Date }>> => {
    const session = db.getCurrentSession();
    if (!session) return [];

    const targetUserId = userId || session.id;

    // If requesting another user's completions, must be admin
    if (targetUserId !== session.id) {
      const profile = await db.getProfile();
      if (!profile.isAdmin) {
        throw new Error("Admin access required to view other users' completions");
      }
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('course_completions')
        .select('course_id, completed_at')
        .eq('user_id', targetUserId);

      if (error) throw new Error(error.message);

      return (data || []).map((c: any) => ({
        courseId: c.course_id,
        completedAt: new Date(c.completed_at)
      }));
    }

    // Mock fallback
    const completions: Array<{ courseId: string; completedAt: Date }> = [];
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(`course_completion_${targetUserId}_`)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          completions.push({
            courseId: data.courseId,
            completedAt: new Date(data.completedAt)
          });
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    return completions;
  },

  getAllCompletions: async (): Promise<Array<{ userId: string; courseId: string; completedAt: Date }>> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    // Check if user is admin
    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('course_completions')
        .select('user_id, course_id, completed_at');

      if (error) throw new Error(error.message);

      return (data || []).map((c: any) => ({
        userId: c.user_id,
        courseId: c.course_id,
        completedAt: new Date(c.completed_at)
      }));
    }

    // Mock fallback
    const completions: Array<{ userId: string; courseId: string; completedAt: Date }> = [];
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('course_completion_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          completions.push({
            userId: data.userId,
            courseId: data.courseId,
            completedAt: new Date(data.completedAt)
          });
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    return completions;
  },

  isUserCourseCompleted: async (userId: string, courseId: string): Promise<boolean> => {
    const completions = await db.getUserCompletedCourses(userId);
    return completions.some(c => c.courseId === courseId);
  }
};