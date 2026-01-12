import { createClient } from '@supabase/supabase-js';
import { Registration, UserProfile, EnglishLevel, CourseQueue, AdminCourseStats, AdminStudentDetail, Course, Message, Language, CourseCategory, CalendarEvent, CourseSession, SessionWithAvailability } from '../types';
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
      // First, get all registrations
      const { data: registrationsData, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('user_id', session.id)
        .order('priority', { ascending: true });

      if (error) throw new Error(error.message);
      
      // Get all unique session IDs that we need dates for
      const assignedSessionIds = (registrationsData || [])
        .map((r: any) => r.assigned_session_id)
        .filter((id: string | null) => id !== null);
      
      const userSelectedSessionIds = (registrationsData || [])
        .map((r: any) => r.user_selected_session_id)
        .filter((id: string | null) => id !== null);
      
      const allSessionIds = [...new Set([...assignedSessionIds, ...userSelectedSessionIds])];
      
      // Fetch session dates in batch
      let sessionDatesMap = new Map<string, string>();
      if (allSessionIds.length > 0) {
        const { data: sessionsData } = await supabase
          .from('course_sessions')
          .select('id, session_date')
          .in('id', allSessionIds);
        
        if (sessionsData) {
          sessionsData.forEach((s: any) => {
            sessionDatesMap.set(s.id, s.session_date);
          });
        }
      }
      
      return (registrationsData || []).map((r: any) => ({
        courseId: r.course_id,
        registeredAt: new Date(r.registered_at),
        priority: r.priority,
        isInvited: r.is_invited || false,
        invitedAt: r.invited_at ? new Date(r.invited_at) : undefined,
        assignedSessionId: r.assigned_session_id || undefined,
        assignedSessionDate: r.assigned_session_id ? sessionDatesMap.get(r.assigned_session_id) : undefined,
        userSelectedSessionId: r.user_selected_session_id || undefined,
        userSelectedSessionDate: r.user_selected_session_id ? sessionDatesMap.get(r.user_selected_session_id) : undefined
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
      const maxRegistrations = await db.getMaxCourseRegistrations();
      const currentRegs = await db.getRegistrations();
      if (currentRegs.length >= maxRegistrations) {
        throw new Error(`Maximum ${maxRegistrations} courses allowed`);
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
    const maxRegistrations = await db.getMaxCourseRegistrations();
    const regs = await db.getRegistrations();
    if (regs.length >= maxRegistrations) {
      throw new Error(`Maximum ${maxRegistrations} courses allowed`);
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
        .select('course_id, user_id');

      if (error) throw new Error(error.message);

      // Get completed courses to exclude from count
      const { data: completions, error: completionsError } = await supabase
        .from('course_completions')
        .select('user_id, course_id');

      if (completionsError) throw new Error(completionsError.message);

      // Create a Set of completed (user_id, course_id) pairs for quick lookup
      const completedSet = new Set<string>();
      (completions || []).forEach((c: any) => {
        completedSet.add(`${c.user_id}:${c.course_id}`);
      });

      // Count registrations per course, excluding completed ones
      const courseCounts = new Map<string, number>();
      (registrations || []).forEach((reg: any) => {
        const courseId = reg.course_id;
        const userId = reg.user_id;
        // Only count if not completed
        if (!completedSet.has(`${userId}:${courseId}`)) {
          courseCounts.set(courseId, (courseCounts.get(courseId) || 0) + 1);
        }
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
          irisId: row.iris_id || undefined,
          // Enrollment management fields
          isInvited: row.is_invited || false,
          invitedAt: row.invited_at ? new Date(row.invited_at) : undefined,
          assignedSessionId: row.assigned_session_id || undefined,
          assignedSessionDate: row.assigned_session_date || undefined,
          userSelectedSessionId: row.user_selected_session_id || undefined,
          userSelectedSessionDate: row.user_selected_session_date || undefined
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

  // --- Welcome Message Methods ---
  getWelcomeMessage: async (language: string): Promise<string | null> => {
    const value = await db.getAppSetting(`welcome_message_${language}`);
    return value;
  },

  setWelcomeMessage: async (language: string, message: string): Promise<{ error: string | null }> => {
    return db.setAppSetting(`welcome_message_${language}`, message);
  },

  // --- Email Templates Methods ---
  getEmailTemplate: async (templateKey: string): Promise<{ subject: string; body: string; variables: string[] } | null> => {
    if (!supabase) {
      // Mock fallback: return default template
      const defaultTemplates: Record<string, { subject: string; body: string; variables: string[] }> = {
        course_invitation: {
          subject: 'Invitation to Join {courseTitle}',
          body: `Hello!

I hope this email finds you well. I'm delighted to invite you to participate in our upcoming course: {courseTitle}.

We would be thrilled to have you join us! To confirm your participation and select your preferred date, you have two options:

1. Visit our website at {websiteUrl} and confirm your participation in the course, where you can also choose your preferred date.

2. Simply reply to this email with your chosen date.

Please note that spaces for this course are limited, so we encourage you to confirm your participation as soon as possible.

Available dates for this course:
{datesList}

We look forward to having you join us for this course. If you have any questions, please don't hesitate to reach out.`,
          variables: ['courseTitle', 'datesList', 'websiteUrl']
        },
        course_reminder: {
          subject: 'Reminder: Upcoming Course {courseTitle}',
          body: `Hello!

This is a friendly reminder that you are confirmed to attend our course: {courseTitle}.

The course session is scheduled for {sessionDate}{sessionTime}{sessionAddress}.

Please make sure you are available on this date. If you have any questions or need to make changes, please don't hesitate to contact us.

You can also visit our website at {websiteUrl} for more information.

We look forward to seeing you soon!`,
          variables: ['courseTitle', 'sessionDate', 'sessionTime', 'sessionAddress', 'websiteUrl']
        }
      };
      return defaultTemplates[templateKey] || null;
    }

    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('subject, body, variables')
        .eq('template_key', templateKey)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        console.error('Error fetching email template:', error);
        return null;
      }

      if (!data) return null;

      return {
        subject: data.subject || '',
        body: data.body || '',
        variables: (data.variables as string[]) || []
      };
    } catch (error) {
      console.error('Error fetching email template:', error);
      return null;
    }
  },

  updateEmailTemplate: async (
    templateKey: string,
    subject: string,
    body: string
  ): Promise<{ error: string | null }> => {
    if (!supabase) {
      // Mock fallback: use localStorage
      localStorage.setItem(`email_template_${templateKey}`, JSON.stringify({ subject, body }));
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
        .from('email_templates')
        .upsert({
          template_key: templateKey,
          subject,
          body,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'template_key'
        });

      if (error) return { error: error.message };
      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Failed to save email template' };
    }
  },

  // --- Course Registration Limit Methods ---
  getMaxCourseRegistrations: async (): Promise<number> => {
    const value = await db.getAppSetting('max_course_registrations');
    if (value) {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return 3; // Default value
  },

  setMaxCourseRegistrations: async (limit: number): Promise<{ error: string | null }> => {
    if (limit < 1 || limit > 100) {
      return { error: 'Limit must be between 1 and 100' };
    }
    return db.setAppSetting('max_course_registrations', limit.toString());
  },

  // --- Contact Information Methods ---
  getContactInfo: async (): Promise<{
    organizationName: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    openingHours: string;
  }> => {
    const value = await db.getAppSetting('contact_info');
    if (value) {
      try {
        return JSON.parse(value);
      } catch (e) {
        console.error('Error parsing contact_info:', e);
      }
    }
    // Default values
    return {
      organizationName: 'Cork City Partnership',
      address: 'Heron House, Blackpool Park\nCork, T23 R50R\nIreland',
      phone: '+353 21 430 2310',
      email: 'info@partnershipcork.ie',
      website: 'www.corkcitypartnership.ie',
      openingHours: 'Monday - Friday: 9:00 AM - 5:00 PM'
    };
  },

  setContactInfo: async (contactInfo: {
    organizationName: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    openingHours: string;
  }): Promise<{ error: string | null }> => {
    try {
      const jsonString = JSON.stringify(contactInfo);
      return db.setAppSetting('contact_info', jsonString);
    } catch (error: any) {
      return { error: error.message || 'Failed to serialize contact info' };
    }
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
        externalLink: e.external_link || undefined,
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
          external_link: event.externalLink || null,
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
        externalLink: data.external_link || undefined,
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
      if (updates.externalLink !== undefined) updateData.external_link = updates.externalLink || null;
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
        externalLink: data.external_link || undefined,
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
  },

  // --- Course Session Methods (Enrollment Management) ---
  
  getCourseSessions: async (courseId: string, includeArchived: boolean = false): Promise<CourseSession[]> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    if (supabase) {
      // Use the function that includes enrollment counts
      const { data, error } = await supabase.rpc('get_course_sessions_with_enrollment', {
        p_course_id: courseId
      });

      if (error) throw new Error(error.message);

      let sessions = (data || []).map((s: any) => ({
        id: s.id,
        courseId: s.course_id,
        sessionDate: s.session_date,
        maxCapacity: s.max_capacity,
        status: s.status as 'active' | 'archived',
        address: s.address || undefined,
        sessionTime: s.session_time || undefined,
        currentEnrollment: s.current_enrollment || 0,
        createdAt: s.created_at ? new Date(s.created_at) : undefined,
        updatedAt: s.updated_at ? new Date(s.updated_at) : undefined
      }));

      if (!includeArchived) {
        sessions = sessions.filter((s: CourseSession) => s.status === 'active');
      }

      return sessions;
    }

    throw new Error("Supabase not configured");
  },

  getNextCourseSessionDate: async (courseId: string): Promise<string | null> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    try {
      const sessions = await db.getCourseSessions(courseId, false);
      if (sessions.length === 0) return null;

      const today = new Date().toISOString().split('T')[0];
      const futureSessions = sessions
        .filter(s => s.sessionDate >= today)
        .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));

      return futureSessions.length > 0 ? futureSessions[0].sessionDate : null;
    } catch (error) {
      console.error('[DB] Failed to get next course session date:', error);
      return null;
    }
  },

  createCourseSession: async (courseId: string, sessionDate: string, maxCapacity: number, address?: string, sessionTime?: string): Promise<CourseSession> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      const insertData: any = {
        course_id: courseId,
        session_date: sessionDate,
        max_capacity: maxCapacity,
        status: 'active'
      };
      
      if (address !== undefined) insertData.address = address || null;
      if (sessionTime !== undefined) insertData.session_time = sessionTime || null;

      const { data, error } = await supabase
        .from('course_sessions')
        .insert(insertData)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return {
        id: data.id,
        courseId: data.course_id,
        sessionDate: data.session_date,
        maxCapacity: data.max_capacity,
        status: data.status as 'active' | 'archived',
        address: data.address || undefined,
        sessionTime: data.session_time || undefined,
        currentEnrollment: 0,
        createdAt: data.created_at ? new Date(data.created_at) : undefined,
        updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
      };
    }

    throw new Error("Supabase not configured");
  },

  updateCourseSession: async (sessionId: string, updates: Partial<Pick<CourseSession, 'sessionDate' | 'maxCapacity' | 'status' | 'address' | 'sessionTime'>>): Promise<CourseSession> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      const updateData: any = {};
      if (updates.sessionDate !== undefined) updateData.session_date = updates.sessionDate;
      if (updates.maxCapacity !== undefined) updateData.max_capacity = updates.maxCapacity;
      if (updates.status !== undefined) updateData.status = updates.status;
      // Use 'in' operator to check if key exists, allowing null values to be set
      if ('address' in updates) {
        updateData.address = updates.address || null;
      }
      if ('sessionTime' in updates) {
        updateData.session_time = updates.sessionTime || null;
      }

      const { data, error } = await supabase
        .from('course_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Get enrollment count
      const { data: countData } = await supabase.rpc('get_session_enrollment_count', {
        p_session_id: sessionId
      });

      return {
        id: data.id,
        courseId: data.course_id,
        sessionDate: data.session_date,
        maxCapacity: data.max_capacity,
        status: data.status as 'active' | 'archived',
        address: data.address || undefined,
        sessionTime: data.session_time || undefined,
        currentEnrollment: countData || 0,
        createdAt: data.created_at ? new Date(data.created_at) : undefined,
        updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
      };
    }

    throw new Error("Supabase not configured");
  },

  deleteCourseSession: async (sessionId: string): Promise<void> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      // Check if any users are assigned to this session
      const { data: countData } = await supabase.rpc('get_session_enrollment_count', {
        p_session_id: sessionId
      });

      if (countData && countData > 0) {
        // Archive instead of delete if users are enrolled
        await db.updateCourseSession(sessionId, { status: 'archived' });
        return;
      }

      const { error } = await supabase
        .from('course_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw new Error(error.message);
      return;
    }

    throw new Error("Supabase not configured");
  },

  getSessionEnrollmentCount: async (sessionId: string): Promise<number> => {
    if (supabase) {
      const { data, error } = await supabase.rpc('get_session_enrollment_count', {
        p_session_id: sessionId
      });

      if (error) throw new Error(error.message);
      return data || 0;
    }

    return 0;
  },

  // --- Enrollment/Invite Methods ---

  setUserInvite: async (userId: string, courseId: string, isInvited: boolean): Promise<void> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      const { error } = await supabase.rpc('set_user_invite', {
        p_user_id: userId,
        p_course_id: courseId,
        p_is_invited: isInvited
      });

      if (error) throw new Error(error.message);
      return;
    }

    throw new Error("Supabase not configured");
  },

  assignUserSession: async (userId: string, courseId: string, sessionId: string | null): Promise<void> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (supabase) {
      const { error } = await supabase.rpc('assign_user_session', {
        p_user_id: userId,
        p_course_id: courseId,
        p_session_id: sessionId
      });

      if (error) throw new Error(error.message);
      return;
    }

    throw new Error("Supabase not configured");
  },

  selectUserSession: async (courseId: string, sessionId: string | null): Promise<void> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    if (supabase) {
      const { error } = await supabase.rpc('select_user_session', {
        p_course_id: courseId,
        p_session_id: sessionId
      });

      if (error) throw new Error(error.message);
      return;
    }

    throw new Error("Supabase not configured");
  },

  getAvailableSessions: async (courseId: string): Promise<SessionWithAvailability[]> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    if (supabase) {
      const { data, error } = await supabase.rpc('get_available_sessions_for_user', {
        p_course_id: courseId
      });

      if (error) throw new Error(error.message);

      return (data || []).map((s: any) => ({
        id: s.id,
        sessionDate: s.session_date,
        maxCapacity: s.max_capacity,
        currentEnrollment: s.current_enrollment || 0,
        isAvailable: s.is_available
      }));
    }

    return [];
  },

  // Get user's registration with enrollment info for a specific course
  getRegistrationWithEnrollment: async (courseId: string): Promise<Registration | null> => {
    const session = db.getCurrentSession();
    if (!session) return null;

    if (supabase) {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('user_id', session.id)
        .eq('course_id', courseId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new Error(error.message);
      }

      return {
        courseId: data.course_id,
        registeredAt: new Date(data.registered_at),
        priority: data.priority,
        isInvited: data.is_invited || false,
        invitedAt: data.invited_at ? new Date(data.invited_at) : undefined,
        assignedSessionId: data.assigned_session_id || undefined,
        userSelectedSessionId: data.user_selected_session_id || undefined
      };
    }

    return null;
  },

  // --- User Search Methods (Admin only) ---
  searchUsers: async (query: string): Promise<Array<{
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    mobileNumber?: string;
    englishLevel: EnglishLevel;
  }>> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    // Check if user is admin
    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (!supabase) {
      return [];
    }

    const searchTerm = `%${query.trim()}%`;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, mobile_number, english_level')
      .or(`email.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},mobile_number.ilike.${searchTerm}`)
      .limit(50);

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => ({
      userId: row.id,
      email: row.email,
      firstName: row.first_name || undefined,
      lastName: row.last_name || undefined,
      mobileNumber: row.mobile_number || undefined,
      englishLevel: (row.english_level as EnglishLevel) || 'None'
    }));
  },

  // Generate a random secure password (user will use password reset to set their own)
  generateRandomPassword: (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const length = 32;
    let password = '';
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      password += chars[array[i] % chars.length];
    }
    return password;
  },

  // Create user by admin (without password - user will use password reset to set their own)
  createUserByAdmin: async (email: string, profileData?: {
    firstName?: string;
    lastName?: string;
    mobileNumber?: string;
    englishLevel?: EnglishLevel;
  }): Promise<{ userId: string; email: string }> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    // Check if user is admin
    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (!supabase) {
      throw new Error("Supabase not configured");
    }

    // Check if user already exists
    const trimmedEmail = email.trim().toLowerCase();
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', trimmedEmail)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(checkError.message || 'Failed to check if user exists');
    }

    if (existingUser) {
      throw new Error('USER_ALREADY_EXISTS');
    }

    // Generate a random password that user will never know
    // User will use "Forgot Password" to set their own password when they want to login
    const randomPassword = db.generateRandomPassword();

    // Create user with email and random password using a separate client instance
    // This prevents the signUp from affecting the current admin session
    // We use a temporary client with persistSession: false to avoid session conflicts
    const tempSupabaseClient = createClient(
      SUPABASE_URL as string,
      SUPABASE_KEY as string,
      {
        auth: {
          persistSession: false, // Don't persist session - this prevents session change
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );

    const { data: signUpData, error: signUpError } = await tempSupabaseClient.auth.signUp({
      email: email.trim(),
      password: randomPassword,
      options: {
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`
      }
    });

    if (signUpError) {
      throw new Error(signUpError.message || 'Failed to create user');
    }

    if (!signUpData.user) {
      throw new Error('User creation failed - no user data returned');
    }

    const userId = signUpData.user.id;

    // Update profile with additional data if provided
    if (profileData && (profileData.firstName || profileData.lastName || profileData.mobileNumber || profileData.englishLevel)) {
      const updateData: any = {};
      if (profileData.firstName !== undefined) updateData.first_name = profileData.firstName.trim() || null;
      if (profileData.lastName !== undefined) updateData.last_name = profileData.lastName.trim() || null;
      if (profileData.mobileNumber !== undefined) updateData.mobile_number = profileData.mobileNumber.trim() || null;
      if (profileData.englishLevel !== undefined) updateData.english_level = profileData.englishLevel;

      // Wait a bit for profile to be created by trigger
      await new Promise(resolve => setTimeout(resolve, 500));

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (updateError) {
        console.error('Failed to update profile after user creation:', updateError);
        // Don't throw error here - user is created, profile update can be done later
      }
    }

    return { userId, email: signUpData.user.email! };
  },

  // Add registration for user by admin (bypasses profile completion check)
  addRegistrationForUserByAdmin: async (userId: string, courseId: string): Promise<void> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    // Check if user is admin
    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (!supabase) {
      throw new Error("Supabase not configured");
    }

    // Check if course is already completed - prevent re-registration
    const isCompleted = await db.isUserCourseCompleted(userId, courseId);
    if (isCompleted) {
      throw new Error('This course has already been completed by this user.');
    }

    // Check current registrations count
    const maxRegistrations = await db.getMaxCourseRegistrations();
    const { data: currentRegs, error: regsError } = await supabase
      .from('registrations')
      .select('course_id, priority')
      .eq('user_id', userId)
      .order('priority', { ascending: true });

    if (regsError) throw new Error(regsError.message);

    if ((currentRegs || []).length >= maxRegistrations) {
      throw new Error(`User already has maximum ${maxRegistrations} course registrations`);
    }

    // Check if already registered
    if ((currentRegs || []).find((r: any) => r.course_id === courseId)) {
      throw new Error('User is already registered for this course');
    }

    const priority = (currentRegs || []).length + 1;
    
    const { error } = await supabase
      .from('registrations')
      .insert({
        user_id: userId,
        course_id: courseId,
        priority: priority
      });

    if (error) throw new Error(error.message);
  },

  // Remove user registration by admin (can remove any user's registration)
  removeUserRegistrationByAdmin: async (userId: string, courseId: string): Promise<void> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    // Check if user is admin
    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    if (!supabase) {
      throw new Error("Supabase not configured");
    }

    // Delete the registration
    const { error } = await supabase
      .from('registrations')
      .delete()
      .eq('user_id', userId)
      .eq('course_id', courseId);

    if (error) throw new Error(error.message);

    // Recalculate priorities for remaining registrations
    const { data: remainingRegs, error: regsError } = await supabase
      .from('registrations')
      .select('course_id, priority')
      .eq('user_id', userId)
      .order('priority', { ascending: true });

    if (regsError) throw new Error(regsError.message);

    if ((remainingRegs || []).length > 0) {
      // Prepare priorities JSON for batch update
      const priorities = (remainingRegs || []).map((reg: any, index: number) => ({
        course_id: reg.course_id,
        priority: index + 1
      }));

      const { error: updateError } = await supabase.rpc('update_registration_priorities', {
        p_user_id: userId,
        p_priorities: priorities
      });

      if (updateError) throw new Error(updateError.message);
    }
  },

  // --- User Deletion Methods (Admin only) ---
  deleteUser: async (userId: string): Promise<void> => {
    const session = db.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    // Check if user is admin
    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      throw new Error("Admin access required");
    }

    // Prevent self-deletion
    if (userId === session.id) {
      throw new Error("Cannot delete your own account");
    }

    if (supabase) {
      // Delete all chat messages for this user
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', userId);

      if (messagesError && messagesError.code !== 'PGRST301') {
        throw new Error(`Failed to delete chat messages: ${messagesError.message}`);
      }

      // Delete all course completions for this user
      const { error: completionsError } = await supabase
        .from('course_completions')
        .delete()
        .eq('user_id', userId);

      if (completionsError && completionsError.code !== 'PGRST301') {
        throw new Error(`Failed to delete course completions: ${completionsError.message}`);
      }

      // Delete all registrations for this user
      const { error: registrationsError } = await supabase
        .from('registrations')
        .delete()
        .eq('user_id', userId);

      if (registrationsError && registrationsError.code !== 'PGRST301') {
        throw new Error(`Failed to delete registrations: ${registrationsError.message}`);
      }

      // Delete user profile (requires admin policy)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError && profileError.code !== 'PGRST301') {
        throw new Error(`Failed to delete profile: ${profileError.message}`);
      }

      // Delete user from auth.users using RPC function
      // This must be done after deleting the profile to avoid foreign key issues
      const { error: authDeleteError } = await supabase.rpc('delete_user_from_auth', {
        p_user_id: userId
      });

      if (authDeleteError) {
        throw new Error(`Failed to delete user from auth: ${authDeleteError.message}`);
      }
      
      return;
    }

    // Mock fallback: Remove all localStorage data for this user
    try {
      // Remove profile
      localStorage.removeItem(STORAGE_KEYS.PROFILE(userId));
      
      // Remove registrations
      localStorage.removeItem(STORAGE_KEYS.REGISTRATIONS(userId));
      
      // Remove chat messages
      localStorage.removeItem(`chat_messages_${userId}`);
      
      // Remove course completions
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(`course_completion_${userId}_`)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error: any) {
      throw new Error(`Failed to delete user data: ${error.message}`);
    }
  },

  // --- Word Template Methods ---
  uploadWordTemplate: async (file: File): Promise<{ error: string | null; url: string | null }> => {
    if (!supabase) {
      // Mock fallback: convert to base64 and store in localStorage
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          localStorage.setItem('word_template_base64', base64);
          resolve({ error: null, url: 'local://word_template.docx' });
        };
        reader.onerror = () => resolve({ error: 'Failed to read file', url: null });
        reader.readAsDataURL(file);
      });
    }

    // Check if user is admin
    const session = db.getCurrentSession();
    if (!session) {
      return { error: 'Not authenticated', url: null };
    }

    const profile = await db.getProfile();
    if (!profile.isAdmin) {
      return { error: 'Admin access required', url: null };
    }

    try {
      const bucketName = 'word-templates';
      
      // Try to upload file first (bucket should be created manually in Supabase Dashboard)
      const fileName = `template_${Date.now()}.docx`;
      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        // Provide helpful error message if bucket doesn't exist
        if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
          return { 
            error: 'Storage bucket "word-templates" not found. Please create it in Supabase Dashboard: Storage → Create bucket → name it "word-templates" → set as private → create.', 
            url: null 
          };
        }
        return { error: uploadError.message, url: null };
      }

      // For private buckets, we need to store the file path, not URL
      // We'll download it using the path when needed
      const filePath = `${bucketName}/${fileName}`;

      // Save file path in app_settings (we'll reconstruct the path when downloading)
      const { error: settingsError } = await db.setAppSetting('word_template_url', filePath);
      if (settingsError) {
        // Try to delete uploaded file on error
        await supabase.storage.from(bucketName).remove([fileName]);
        return { error: settingsError, url: null };
      }

      return { error: null, url: filePath };
    } catch (error: any) {
      return { error: error.message || 'Failed to upload template', url: null };
    }
  },

  getWordTemplateUrl: async (): Promise<string | null> => {
    const url = await db.getAppSetting('word_template_url');
    return url;
  },

  downloadWordTemplate: async (): Promise<{ error: string | null; blob: Blob | null }> => {
    if (!supabase) {
      // Mock fallback: get from localStorage
      const base64 = localStorage.getItem('word_template_base64');
      if (!base64) {
        return { error: 'Template not found', blob: null };
      }
      try {
        const response = await fetch(base64);
        const blob = await response.blob();
        return { error: null, blob };
      } catch (error: any) {
        return { error: error.message, blob: null };
      }
    }

    const filePath = await db.getWordTemplateUrl();
    if (!filePath) {
      return { error: 'Template not found', blob: null };
    }

    try {
      // File path format: "word-templates/template_1234567890.docx"
      const pathParts = filePath.split('/');
      const bucketName = pathParts[0];
      const fileName = pathParts.slice(1).join('/');

      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(fileName);

      if (error) {
        if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
          return { 
            error: 'Storage bucket "word-templates" not found. Please create it in Supabase Dashboard: Storage → Create bucket → name it "word-templates" → set as private → create.', 
            blob: null 
          };
        }
        return { error: error.message, blob: null };
      }

      return { error: null, blob: data };
    } catch (error: any) {
      return { error: error.message || 'Failed to download template', blob: null };
    }
  }
};