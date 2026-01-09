import { createClient } from '@supabase/supabase-js';
import { Registration, UserProfile, EnglishLevel, CourseQueue, AdminCourseStats, AdminStudentDetail, Course, Message, Language, CourseCategory, CalendarEvent } from '../types';
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
  DEMO_SESSION: 'demo_session',
  DEMO_CHAT: 'demo_chat_messages'
};

// Demo user constants - these are local-only, not stored in database
const DEMO_USER_ID = 'demo-user-local';
const DEMO_USER_EMAIL = 'demo@local.example';

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

  signUp: async (email: string, password?: string): Promise<{ user: { id: string, email: string } | null, error: string | null, needsEmailConfirmation?: boolean }> => {
    if (!supabase) {
      // Fallback to mock
      return db.signIn(email, password);
    }

    try {
      // Require password for signup (no magic link to avoid email sending)
      if (!password) {
        return { user: null, error: 'Password is required for registration' };
      }

      // Signup with password and email redirect for confirmation
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`
        }
      });

      if (error) return { user: null, error: error.message };
      
      // If email confirmation is disabled, user should be logged in immediately
      if (data.user && data.session) {
        return { user: { id: data.user.id, email: data.user.email! }, error: null };
      }

      // If email confirmation is required - return special flag
      if (data.user && !data.session) {
        return { user: null, error: null, needsEmailConfirmation: true };
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
redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
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
    // Check if this is a demo user session
    const isDemoSession = localStorage.getItem(STORAGE_KEYS.DEMO_SESSION) === 'true';
    
    if (isDemoSession) {
      // Just clear local demo data
      localStorage.removeItem(STORAGE_KEYS.DEMO_SESSION);
      localStorage.removeItem(STORAGE_KEYS.DEMO_CHAT);
      return;
    }
    
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    }
  },

  getCurrentSession: () => {
    // First check if there's a demo session
    const isDemoSession = localStorage.getItem(STORAGE_KEYS.DEMO_SESSION) === 'true';
    if (isDemoSession) {
      return { id: DEMO_USER_ID, email: DEMO_USER_EMAIL };
    }
    
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

    // Return mock profile for demo user
    if (db.isDemoUserSync()) {
      return {
        id: DEMO_USER_ID,
        email: DEMO_USER_EMAIL,
        englishLevel: 'B1',
        firstName: 'Demo',
        lastName: 'User',
        mobileNumber: '+353000000000',
        address: 'Demo Address, Cork City',
        eircode: 'T12DEMO',
        dateOfBirth: '1990-01-01',
        isAdmin: false
      };
    }

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

  // Update user profile by admin (can update any user's profile including admin-only fields)
  updateUserProfileByAdmin: async (userId: string, profileData: {
    firstName?: string;
    lastName?: string;
    mobileNumber?: string;
    address?: string;
    eircode?: string;
    dateOfBirth?: string;
    englishLevel?: EnglishLevel;
    ldcRef?: string;
    irisId?: string;
  }): Promise<void> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    // Check if user is admin
    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (!supabase) {
      // Mock fallback: not supported for admin operations
      throw new Error("Supabase not configured");
    }

    const updateData: any = {};
    if (profileData.firstName !== undefined) updateData.first_name = profileData.firstName.trim() || null;
    if (profileData.lastName !== undefined) updateData.last_name = profileData.lastName.trim() || null;
    if (profileData.mobileNumber !== undefined) updateData.mobile_number = profileData.mobileNumber.trim() || null;
    if (profileData.address !== undefined) updateData.address = profileData.address.trim() || null;
    if (profileData.eircode !== undefined) updateData.eircode = profileData.eircode.trim() || null;
    if (profileData.dateOfBirth !== undefined) updateData.date_of_birth = profileData.dateOfBirth.trim() || null;
    if (profileData.englishLevel !== undefined) updateData.english_level = profileData.englishLevel;
    if (profileData.ldcRef !== undefined) updateData.ldc_ref = profileData.ldcRef.trim() || null;
    if (profileData.irisId !== undefined) updateData.iris_id = profileData.irisId.trim() || null;

    // Check if updateData is not empty
    if (Object.keys(updateData).length === 0) {
      // No fields to update, but this is not an error
      return;
    }

    // Check if profile exists
    const { data: existingProfile, error: selectError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (selectError && selectError.code === 'PGRST116') {
      // Profile doesn't exist - this shouldn't happen, but handle it gracefully
      throw new Error("User profile not found");
    } else if (selectError) {
      throw new Error(selectError.message || 'Failed to check profile');
    } else {
      // Profile exists, update it
      const { data: updatedData, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select();

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update profile');
      }

      // Verify that update actually happened
      if (!updatedData || updatedData.length === 0) {
        throw new Error('Profile update failed: no rows were updated. This may be due to RLS policies or the profile not existing.');
      }
    }
  },

  // --- Registration Methods ---
  getRegistrations: async (): Promise<Registration[]> => {
    const session = db.getCurrentSession();
    if (!session) return [];

    // Demo users cannot have registrations
    if (db.isDemoUserSync()) {
      return [];
    }

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

    // Demo users cannot register for courses
    if (db.isDemoUserSync()) {
      throw new Error('DEMO_USER_CANNOT_REGISTER');
    }

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

      // Recalculate priorities for remaining registrations using SQL function
      const remainingRegs = await db.getRegistrations();
      if (remainingRegs.length > 0) {
        // Prepare priorities JSON for batch update
        const priorities = remainingRegs.map((reg, index) => ({
          course_id: reg.courseId,
          priority: index + 1
        }));

        const { error: updateError } = await supabase.rpc('update_registration_priorities', {
          p_user_id: session.id,
          p_priorities: priorities
        });

        if (updateError) throw new Error(updateError.message);
      }
      return;
    }

    // Mock fallback:
    const regs = await db.getRegistrations();
    const filtered = regs.filter(r => r.courseId !== courseId);
    const updated = filtered.map((r, index) => ({ ...r, priority: index + 1 }));
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS(session.id), JSON.stringify(updated));
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

      // Update all priorities using SQL function
      const priorities = regs.map((reg, index) => ({
        course_id: reg.courseId,
        priority: index + 1
      }));

      const { error: updateError } = await supabase.rpc('update_registration_priorities', {
        p_user_id: session.id,
        p_priorities: priorities
      });

      if (updateError) throw new Error(updateError.message);
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
        // Function already returns only active courses with queue lengths
        const queues: CourseQueue[] = (queueData || []).map((q: any) => ({
          courseId: q.course_id,
          queueLength: Number(q.queue_length) || 0
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
    const cacheKey = `course_queue_${courseId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      return parseInt(cached, 10) || 0;
    }
    return 0; // Return 0 if not cached yet
  },

  // Async version for loading queues (caches counts from registrations)
  loadCourseQueues: async (): Promise<void> => {
    const queues = await db.getCourseQueues();
    // Cache in sessionStorage for synchronous access
    queues.forEach(q => {
      sessionStorage.setItem(`course_queue_${q.courseId}`, q.queueLength.toString());
    });
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
          isAdmin: p.is_admin || false,
          ldcRef: p.ldc_ref || undefined,
          irisId: p.iris_id || undefined
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
      // Get all users with details using SQL function with JOIN
      const { data, error } = await supabase.rpc('get_all_users_with_details');

      if (error) throw new Error(error.message);

      return (data || []).map((row: any) => {
        // Migrate old name format if needed
        let firstName = row.first_name;
        let lastName = row.last_name;

        return {
          userId: row.user_id,
          email: row.email,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          mobileNumber: row.mobile_number || undefined,
          address: row.address || undefined,
          eircode: row.eircode || undefined,
          dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth).toISOString().split('T')[0] : undefined,
          englishLevel: (row.english_level as EnglishLevel) || 'None',
          isAdmin: row.is_admin || false,
          createdAt: row.created_at ? new Date(row.created_at) : undefined,
          registeredCourses: row.registered_courses || [],
          completedCourses: row.completed_courses || [],
          isProfileComplete: row.is_profile_complete || false,
          ldcRef: row.ldc_ref || undefined,
          irisId: row.iris_id || undefined
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
      // Get all student details for this course using SQL function with JOIN
      const { data, error } = await supabase.rpc('get_course_student_details', {
        p_course_id: courseId
      });

      if (error) throw new Error(error.message);

      if (!data || data.length === 0) {
        return [];
      }

      // Map to AdminStudentDetail format
      return data.map((row: any) => {
        // Migrate old name format if needed (shouldn't be needed with new schema, but keep for safety)
        let firstName = row.first_name;
        let lastName = row.last_name;

        return {
          userId: row.user_id,
          email: row.email || '',
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          mobileNumber: row.mobile_number || undefined,
          address: row.address || undefined,
          eircode: row.eircode || undefined,
          dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth).toISOString().split('T')[0] : undefined,
          englishLevel: (row.english_level as EnglishLevel) || 'None',
          registeredAt: new Date(row.registered_at),
          priority: row.priority || 999,
          ldcRef: row.ldc_ref || undefined,
          irisId: row.iris_id || undefined
        };
      });
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
          nextCourseDate: c.next_course_date ? new Date(c.next_course_date).toISOString().split('T')[0] : undefined,
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
          nextCourseDate: c.next_course_date ? new Date(c.next_course_date).toISOString().split('T')[0] : undefined,
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
          next_course_date: course.nextCourseDate || null,
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
        nextCourseDate: data.next_course_date ? new Date(data.next_course_date).toISOString().split('T')[0] : undefined,
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
      if (updates.nextCourseDate !== undefined) updateData.next_course_date = updates.nextCourseDate || null;
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
        nextCourseDate: data.next_course_date ? new Date(data.next_course_date).toISOString().split('T')[0] : undefined,
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

    // Demo users save chat to localStorage only
    if (db.isDemoUserSync()) {
      try {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.DEMO_CHAT) || '[]');
        existing.push({
          id: Date.now().toString(),
          role,
          content,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem(STORAGE_KEYS.DEMO_CHAT, JSON.stringify(existing));
      } catch (e) {
        console.error('Failed to save demo chat message:', e);
      }
      return;
    }

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

    // Demo users load chat from localStorage only
    if (db.isDemoUserSync()) {
      const stored = localStorage.getItem(STORAGE_KEYS.DEMO_CHAT);
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
        console.error('Failed to parse demo chat messages:', e);
        return [];
      }
    }

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

    // Demo users clear chat from localStorage only
    if (db.isDemoUserSync()) {
      localStorage.removeItem(STORAGE_KEYS.DEMO_CHAT);
      return;
    }

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

    // Return mock data for demo users
    if (db.isDemoUserSync()) {
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
    }

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
  },

  // --- Password Reset Methods ---
  resetPassword: async (email: string): Promise<{ error: string | null }> => {
    if (!supabase) {
      return { error: 'Supabase is not configured' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`
      });

      if (error) return { error: error.message };
      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Failed to send reset password email' };
    }
  },

  updatePassword: async (newPassword: string): Promise<{ error: string | null }> => {
    if (!supabase) {
      return { error: 'Supabase is not configured' };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) return { error: error.message };
      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Failed to update password' };
    }
  },

  // --- App Settings Methods (for demo mode, etc.) ---
  getAppSetting: async (key: string): Promise<string | null> => {
    if (!supabase) {
      // Mock fallback: use localStorage
      return localStorage.getItem(`app_setting_${key}`);
    }

    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        console.error('Error fetching app setting:', error);
        return null;
      }

      return data?.value || null;
    } catch (error) {
      console.error('Error fetching app setting:', error);
      return null;
    }
  },

  setAppSetting: async (key: string, value: string): Promise<{ error: string | null }> => {
    if (!supabase) {
      // Mock fallback: use localStorage
      localStorage.setItem(`app_setting_${key}`, value);
      return { error: null };
    }

    // Check if user is admin
    const session = db.getCurrentSession();
    if (!session) {
      return { error: 'Not authenticated' };
    }

    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      return { error: 'Admin access required' };
    }

    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key,
          value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) return { error: error.message };
      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Failed to save setting' };
    }
  },

  getDemoEnabled: async (): Promise<boolean> => {
    const value = await db.getAppSetting('demo_enabled');
    return value === 'true';
  },

  setDemoEnabled: async (enabled: boolean): Promise<{ error: string | null }> => {
    return db.setAppSetting('demo_enabled', enabled ? 'true' : 'false');
  },

  // Sign in as demo user - creates local session only, no database interaction
  signInAsDemo: async (): Promise<{ user: { id: string, email: string } | null, error: string | null }> => {
    // Check if demo mode is enabled
    const demoEnabled = await db.getDemoEnabled();
    if (!demoEnabled) {
      return { user: null, error: 'Demo mode is not enabled' };
    }

    // Create local demo session
    localStorage.setItem(STORAGE_KEYS.DEMO_SESSION, 'true');
    
    return { 
      user: { id: DEMO_USER_ID, email: DEMO_USER_EMAIL }, 
      error: null 
    };
  },

  // Synchronous check if current user is demo user (for use in other db methods)
  isDemoUserSync: (): boolean => {
    return localStorage.getItem(STORAGE_KEYS.DEMO_SESSION) === 'true';
  },

  // Async check if current user is demo user (for external use)
  isDemoUser: async (): Promise<boolean> => {
    return db.isDemoUserSync();
  },

  // --- Course Category Methods ---
  getCategories: async (): Promise<CourseCategory[]> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('course_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
        return [];
      }

      return (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        sortOrder: c.sort_order,
        createdAt: c.created_at ? new Date(c.created_at) : undefined
      }));
    }

    // Mock fallback: return default categories
    return [
      { id: 'safety', name: 'Safety', icon: 'HardHat', color: 'text-orange-500', sortOrder: 1 },
      { id: 'service', name: 'Service', icon: 'Users', color: 'text-purple-500', sortOrder: 2 },
      { id: 'security', name: 'Security', icon: 'Shield', color: 'text-blue-800', sortOrder: 3 },
      { id: 'food-safety', name: 'Food Safety', icon: 'BookOpen', color: 'text-green-500', sortOrder: 4 },
      { id: 'hospitality', name: 'Hospitality', icon: 'Coffee', color: 'text-amber-600', sortOrder: 5 },
      { id: 'healthcare', name: 'Healthcare', icon: 'HeartPulse', color: 'text-red-500', sortOrder: 6 },
      { id: 'education', name: 'Education', icon: 'GraduationCap', color: 'text-indigo-500', sortOrder: 7 },
      { id: 'cleaning', name: 'Cleaning', icon: 'Sparkles', color: 'text-cyan-500', sortOrder: 8 },
      { id: 'logistics', name: 'Logistics', icon: 'Warehouse', color: 'text-slate-500', sortOrder: 9 },
      { id: 'technology', name: 'Technology', icon: 'Cpu', color: 'text-blue-500', sortOrder: 10 },
      { id: 'business', name: 'Business', icon: 'Briefcase', color: 'text-gray-700', sortOrder: 11 },
      { id: 'retail', name: 'Retail', icon: 'ShoppingBag', color: 'text-pink-500', sortOrder: 12 },
      { id: 'construction', name: 'Construction', icon: 'Hammer', color: 'text-yellow-600', sortOrder: 13 },
      { id: 'beauty', name: 'Beauty', icon: 'Scissors', color: 'text-rose-400', sortOrder: 14 },
      { id: 'childcare', name: 'Childcare', icon: 'Baby', color: 'text-sky-400', sortOrder: 15 },
      { id: 'agriculture', name: 'Agriculture', icon: 'Leaf', color: 'text-green-600', sortOrder: 16 },
      { id: 'transportation', name: 'Transportation', icon: 'Car', color: 'text-indigo-400', sortOrder: 17 },
      { id: 'social-care', name: 'Social Care', icon: 'Heart', color: 'text-red-400', sortOrder: 18 },
      { id: 'environmental', name: 'Environmental', icon: 'TreePine', color: 'text-emerald-500', sortOrder: 19 }
    ];
  },

  createCategory: async (category: Omit<CourseCategory, 'createdAt'>): Promise<CourseCategory> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('course_categories')
        .insert({
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          sort_order: category.sortOrder || 0
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      return {
        id: data.id,
        name: data.name,
        icon: data.icon,
        color: data.color,
        sortOrder: data.sort_order,
        createdAt: data.created_at ? new Date(data.created_at) : undefined
      };
    }

    throw new Error("Supabase not configured");
  },

  updateCategory: async (categoryId: string, updates: Partial<Omit<CourseCategory, 'id' | 'createdAt'>>): Promise<CourseCategory> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder;

      const { data, error } = await supabase
        .from('course_categories')
        .update(updateData)
        .eq('id', categoryId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return {
        id: data.id,
        name: data.name,
        icon: data.icon,
        color: data.color,
        sortOrder: data.sort_order,
        createdAt: data.created_at ? new Date(data.created_at) : undefined
      };
    }

    throw new Error("Supabase not configured");
  },

  deleteCategory: async (categoryId: string): Promise<void> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      // Check if any courses use this category
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id')
        .eq('category', categoryId)
        .limit(1);

      if (coursesError) throw new Error(coursesError.message);

      if (courses && courses.length > 0) {
        throw new Error("Cannot delete category: it is used by existing courses");
      }

      const { error } = await supabase
        .from('course_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw new Error(error.message);
      return;
    }

    throw new Error("Supabase not configured");
  },

  // --- Calendar Event Methods ---
  getCalendarEvents: async (isAdmin: boolean = false): Promise<CalendarEvent[]> => {
    if (supabase) {
      // Get calendar events with creator info using SQL function with JOIN
      const { data, error } = await supabase.rpc('get_calendar_events_with_creators', {
        p_is_admin: isAdmin
      });

      if (error) {
        console.error('Error fetching calendar events:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Map to CalendarEvent format
      return data.map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description || undefined,
        icon: e.icon,
        eventDate: e.event_date,
        eventTime: e.event_time || undefined,
        isPublic: e.is_public,
        createdBy: e.created_by || undefined,
        createdByName: e.created_by_name || undefined,
        createdByEmail: e.created_by_email || undefined,
        createdAt: e.created_at ? new Date(e.created_at) : undefined,
        updatedAt: e.updated_at ? new Date(e.updated_at) : undefined
      }));
    }

    // Mock fallback
    return [];
  },

  createCalendarEvent: async (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<CalendarEvent> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          title: event.title,
          description: event.description || null,
          icon: event.icon,
          event_date: event.eventDate,
          event_time: event.eventTime || null,
          is_public: event.isPublic,
          created_by: session.id
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      return {
        id: data.id,
        title: data.title,
        description: data.description || undefined,
        icon: data.icon,
        eventDate: data.event_date,
        eventTime: data.event_time || undefined,
        isPublic: data.is_public,
        createdBy: data.created_by || undefined,
        createdAt: data.created_at ? new Date(data.created_at) : undefined,
        updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
      };
    }

    throw new Error("Supabase not configured");
  },

  updateCalendarEvent: async (eventId: string, updates: Partial<Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>): Promise<CalendarEvent> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      const updateData: any = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.eventDate !== undefined) updateData.event_date = updates.eventDate;
      if (updates.eventTime !== undefined) updateData.event_time = updates.eventTime || null;
      if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic;

      const { data, error } = await supabase
        .from('calendar_events')
        .update(updateData)
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return {
        id: data.id,
        title: data.title,
        description: data.description || undefined,
        icon: data.icon,
        eventDate: data.event_date,
        eventTime: data.event_time || undefined,
        isPublic: data.is_public,
        createdBy: data.created_by || undefined,
        createdAt: data.created_at ? new Date(data.created_at) : undefined,
        updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
      };
    }

    throw new Error("Supabase not configured");
  },

  deleteCalendarEvent: async (eventId: string): Promise<void> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw new Error(error.message);
      return;
    }

    throw new Error("Supabase not configured");
  }
};