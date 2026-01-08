export interface Course {
  id: string;
  title: string;
  category: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  nextCourseDate?: string; // ISO date string (YYYY-MM-DD) for when the next course session starts
  minEnglishLevel?: EnglishLevel; // Minimum English level required for this course
  isActive?: boolean; // Whether the course is active and visible
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  isError?: boolean;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export type EnglishLevel = 'None' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type Language = 'en' | 'ua' | 'ru' | 'ar';
export type Theme = 'light' | 'dark';

export interface UserProfile {
  id: string;
  email: string;
  englishLevel: EnglishLevel;
  name?: string; // Deprecated - use firstName and lastName instead
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  address?: string;
  eircode?: string;
  dateOfBirth?: string; // ISO date string (YYYY-MM-DD)
  isAdmin?: boolean; // Admin access flag
}

export interface AdminCourseStats {
  courseId: string;
  courseTitle: string;
  registrantCount: number;
}

export interface AdminStudentDetail {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  address?: string;
  eircode?: string;
  dateOfBirth?: string;
  englishLevel: EnglishLevel;
  registeredAt: Date;
  priority: number;
  isCompleted?: boolean; // Whether admin marked this course as completed for this user
  completedAt?: Date;
}

export interface Registration {
  courseId: string;
  registeredAt: Date;
  priority?: number; // 1 = highest priority, 2, 3
}

export interface CourseQueue {
  courseId: string;
  queueLength: number; // number of people in queue
}

export interface CourseCompletion {
  userId: string;
  courseId: string;
  completedAt: Date;
  markedBy?: string; // Admin who marked it as completed
}

export interface AdminUserDetail {
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
  registeredCourses: string[]; // Course IDs the user is registered for
  completedCourses: string[]; // Course IDs marked as completed
  isProfileComplete: boolean;
}

export interface CourseCategory {
  id: string;
  name: string;
  icon: string; // lucide-react icon name
  color: string; // Tailwind color class (e.g., "text-blue-500")
  sortOrder?: number;
  createdAt?: Date;
}