import React, { useState, useEffect } from 'react';
import { X, Search, User, Loader2, UserPlus, AlertCircle, Plus, Mail, User as UserIcon, Info } from 'lucide-react';
import { Language, EnglishLevel } from '../types';
import { TRANSLATIONS } from '../translations';
import { db } from '../services/db';

interface AdminAddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  language: Language;
  courseId: string;
}

interface UserSearchResult {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  englishLevel: string;
}

const ENGLISH_LEVELS: EnglishLevel[] = ['None', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const AdminAddParticipantModal: React.FC<AdminAddParticipantModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  language,
  courseId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Create user form fields
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserMobileNumber, setNewUserMobileNumber] = useState('');
  const [newUserEnglishLevel, setNewUserEnglishLevel] = useState<EnglishLevel>('None');
  
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setError(null);
      setSelectedUserId(null);
      setShowCreateForm(false);
      setNewUserEmail('');
      setNewUserFirstName('');
      setNewUserLastName('');
      setNewUserMobileNumber('');
      setNewUserEnglishLevel('None');
    }
  }, [isOpen]);

  // Search users with debounce
  useEffect(() => {
    if (!isOpen) return;
    
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      try {
        const results = await db.searchUsers(trimmedQuery);
        setSearchResults(results);
      } catch (err: any) {
        console.error('Failed to search users:', err);
        setError(err.message || 'Failed to search users');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, isOpen]);

  const handleAddParticipant = async (userId: string) => {
    setIsAdding(true);
    setError(null);
    setSelectedUserId(userId);

    try {
      await db.addRegistrationForUserByAdmin(userId, courseId);
      
      // Wait a bit to ensure database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refresh the student list
      await onSave();
      
      // Close modal
      onClose();
    } catch (err: any) {
      console.error('Failed to add participant:', err);
      setError(err.message || 'Failed to add participant. Please try again.');
    } finally {
      setIsAdding(false);
      setSelectedUserId(null);
    }
  };

  const handleCreateAndAddUser = async () => {
    if (!newUserEmail.trim()) {
      setError(t.adminCreateUserEmailRequired || 'Email is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Create user (without password - user will use password reset to set their own)
      const { userId } = await db.createUserByAdmin(
        newUserEmail.trim(),
        {
          firstName: newUserFirstName.trim() || undefined,
          lastName: newUserLastName.trim() || undefined,
          mobileNumber: newUserMobileNumber.trim() || undefined,
          englishLevel: newUserEnglishLevel
        }
      );

      // Wait a bit for user creation to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Register user for the course
      await db.addRegistrationForUserByAdmin(userId, courseId);
      
      // Wait a bit to ensure database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refresh the student list
      await onSave();
      
      // Close modal
      onClose();
    } catch (err: any) {
      console.error('Failed to create and add user:', err);
      if (err.message === 'USER_ALREADY_EXISTS') {
        setError(t.adminCreateUserAlreadyExists || 'A user with this email already exists');
      } else {
        setError(err.message || 'Failed to create user. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isAdding) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4" 
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <UserPlus size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t.adminAddParticipant || 'Add Participant'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {showCreateForm 
                  ? (t.adminCreateNewUser || 'Create a new user and add to this course')
                  : (t.adminAddParticipantDesc || 'Search for a user to add to this course')
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isAdding || isCreating}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Toggle between search and create */}
          {!showCreateForm && (
            <div className="mb-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600 transition-colors w-full sm:w-auto"
              >
                <Plus size={18} />
                {t.adminCreateNewUser || 'Create New User'}
              </button>
            </div>
          )}

          {showCreateForm ? (
            /* Create User Form */
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t.adminCreateNewUser || 'Create New User'}
                </h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  disabled={isCreating}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50"
                >
                  {t.adminBackToSearch || 'Back to Search'}
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t.adminExportEmail || 'Email'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder={t.adminExportEmail || 'Email'}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 outline-none"
                      disabled={isCreating}
                    />
                  </div>
                </div>

                {/* Info box about password */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
                        {t.adminCreateUserNoPasswordTitle || 'No Password Required'}
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        {t.adminCreateUserNoPasswordHint || 'User will be created without a password. When they want to access their account, they can use "Forgot Password" to set their own password.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t.adminExportFirstName || 'First Name'}
                    </label>
                    <div className="relative">
                      <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={newUserFirstName}
                        onChange={(e) => setNewUserFirstName(e.target.value)}
                        placeholder={t.adminExportFirstName || 'First Name'}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 outline-none"
                        disabled={isCreating}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t.adminExportLastName || 'Last Name'}
                    </label>
                    <div className="relative">
                      <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={newUserLastName}
                        onChange={(e) => setNewUserLastName(e.target.value)}
                        placeholder={t.adminExportLastName || 'Last Name'}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 outline-none"
                        disabled={isCreating}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t.adminExportMobile || 'Mobile Number'}
                    </label>
                    <input
                      type="tel"
                      value={newUserMobileNumber}
                      onChange={(e) => setNewUserMobileNumber(e.target.value)}
                      placeholder={t.adminExportMobile || 'Mobile Number'}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 outline-none"
                      disabled={isCreating}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t.adminExportEnglishLevel || 'English Level'}
                    </label>
                    <select
                      value={newUserEnglishLevel}
                      onChange={(e) => setNewUserEnglishLevel(e.target.value as EnglishLevel)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 outline-none"
                      disabled={isCreating}
                    >
                      {ENGLISH_LEVELS.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleCreateAndAddUser}
                  disabled={isCreating || !newUserEmail.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isCreating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>{t.adminCreating || 'Creating...'}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      <span>{t.adminCreateAndAdd || 'Create User & Add to Course'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Search Users */
            <>
              {/* Search Input */}
              <div className="mb-4">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.adminSearchUserPlaceholder || 'Search by email, name, or phone number...'}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 outline-none"
                    disabled={isAdding}
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 size={18} className="animate-spin text-indigo-500" />
                    </div>
                  )}
                </div>
                {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {t.adminSearchMinLength || 'Please enter at least 2 characters to search'}
                  </p>
                )}
              </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                  {t.adminError || 'Error'}
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
            <div className="text-center py-12">
              <User size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                {t.adminNoUsersFound || 'No users found. Try a different search term.'}
              </p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {t.adminSearchResults || 'Search Results'} ({searchResults.length})
              </p>
              {searchResults.map((user) => (
                <div
                  key={user.userId}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <User size={18} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user.firstName || user.lastName || user.email}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      {(user.mobileNumber || user.englishLevel) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {user.mobileNumber && (
                            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                              {user.mobileNumber}
                            </span>
                          )}
                          {user.englishLevel && (
                            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                              {user.englishLevel}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddParticipant(user.userId)}
                      disabled={isAdding && selectedUserId === user.userId}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 flex-shrink-0 ${
                        isAdding && selectedUserId === user.userId
                          ? 'bg-indigo-400 dark:bg-indigo-600 text-white cursor-wait'
                          : 'bg-indigo-600 dark:bg-indigo-700 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isAdding && selectedUserId === user.userId ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>{t.adminAdding || 'Adding...'}</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} />
                          <span>{t.adminAdd || 'Add'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!showCreateForm && (
          <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t.adminAddParticipantHint || 'Search for users by email, name, or phone number. Or create a new user if they don\'t have an account.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
