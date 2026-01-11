import React, { useState, useEffect, useRef } from 'react';
import { X, User, Save, Shield, Trash2 } from 'lucide-react';
import { Language, EnglishLevel, AdminUserDetail } from '../types';
import { TRANSLATIONS } from '../translations';
import { db } from '../services/db';
import { ConfirmationModal } from './ConfirmationModal';

interface AdminUserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  language: Language;
  user: AdminUserDetail | null;
}

const ENGLISH_LEVELS: EnglishLevel[] = ['None', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const AdminUserProfileModal: React.FC<AdminUserProfileModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  language,
  user
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [eircode, setEircode] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [englishLevel, setEnglishLevel] = useState<EnglishLevel>('None');
  const [ldcRef, setLdcRef] = useState('');
  const [irisId, setIrisId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  // Track which user ID was initialized to prevent resetting form on tab switch
  const initializedUserIdRef = useRef<string | null>(null);
  const wasOpenRef = useRef<boolean>(false);

  // Initialize form with user data when modal opens
  useEffect(() => {
    const currentUserId = user?.userId || null;
    const shouldInitialize = isOpen && (
      !wasOpenRef.current || // Modal just opened
      initializedUserIdRef.current !== currentUserId // Different user selected
    );
    
    if (shouldInitialize && user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setMobileNumber(user.mobileNumber || '');
      setAddress(user.address || '');
      setEircode(user.eircode || '');
      setDateOfBirth(user.dateOfBirth || '');
      setEnglishLevel(user.englishLevel || 'None');
      setLdcRef(user.ldcRef || '');
      setIrisId(user.irisId || '');
      setError(null);
      initializedUserIdRef.current = currentUserId;
    }
    
    wasOpenRef.current = isOpen;
    
    // Reset refs when modal closes
    if (!isOpen) {
      initializedUserIdRef.current = null;
    }
  }, [isOpen, user?.userId, user]);

  if (!isOpen || !user) {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      await db.updateUserProfileByAdmin(user.userId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        mobileNumber: mobileNumber.trim(),
        address: address.trim(),
        eircode: eircode.trim(),
        dateOfBirth: dateOfBirth.trim(),
        englishLevel: englishLevel,
        ldcRef: ldcRef.trim(),
        irisId: irisId.trim()
      });

      // Wait a bit to ensure database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Wait for onSave to complete before closing
      await onSave();
    } catch (error: any) {
      console.error('Failed to save user profile:', error);
      setError(error?.message || 'Failed to save user profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      await db.deleteUser(user.userId);
      
      // Wait a bit to ensure database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Close confirmation modal and main modal
      setShowDeleteConfirm(false);
      
      // Wait for onSave to complete before closing
      await onSave();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      setError(error?.message || 'Failed to delete user profile. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4" 
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center mb-3">
            <Shield size={24} />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white text-center">
            {t.adminEditUserProfile || 'Edit User Profile'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
            {user.email}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.firstNameLabel || 'First Name'}
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t.firstNamePlaceholder || 'First name'}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.lastNameLabel || 'Last Name'}
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t.lastNamePlaceholder || 'Last name'}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.mobileNumberLabel || 'Mobile Number'}
            </label>
            <input
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder={t.mobileNumberPlaceholder || 'Mobile number'}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.addressLabel || 'Address'}
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t.addressPlaceholder || 'Address'}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.eircodeLabel || 'Eircode'}
              </label>
              <input
                type="text"
                value={eircode}
                onChange={(e) => setEircode(e.target.value.toUpperCase())}
                placeholder={t.eircodePlaceholder || 'Eircode'}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.dateOfBirthLabel || 'Date of Birth'}
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.englishLevelLabel || 'English Level'}
            </label>
            <select
              value={englishLevel}
              onChange={(e) => setEnglishLevel(e.target.value as EnglishLevel)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none transition-all"
            >
              {ENGLISH_LEVELS.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          {/* Admin-only fields */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-purple-600 dark:text-purple-400" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t.adminOnlyFields || 'Admin Only Fields'}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  LDC Ref
                </label>
                <input
                  type="text"
                  value={ldcRef}
                  onChange={(e) => setLdcRef(e.target.value)}
                  placeholder="LDC Reference"
                  className="w-full px-4 py-2.5 rounded-lg border border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-purple-500 dark:focus:border-purple-600 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/30 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  IRIS ID
                </label>
                <input
                  type="text"
                  value={irisId}
                  onChange={(e) => setIrisId(e.target.value)}
                  placeholder="IRIS ID"
                  className="w-full px-4 py-2.5 rounded-lg border border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-purple-500 dark:focus:border-purple-600 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/30 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-6">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t.cancel || 'Cancel'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isDeleting}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                !isSaving && !isDeleting
                  ? 'bg-indigo-600 dark:bg-indigo-700 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-md'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save size={18} />
              {isSaving ? (t.saving || 'Saving...') : (t.save || 'Save')}
            </button>
          </div>
          
          <button
            onClick={handleDeleteClick}
            disabled={isSaving || isDeleting}
            className="w-full px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-600 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={18} />
            {t.adminDeleteProfile || 'Delete Profile'}
          </button>
        </div>
      </div>

      {/* Confirmation Modal for delete */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteConfirm(false);
          }
        }}
        onConfirm={handleConfirmDelete}
        title={t.adminDeleteProfileTitle || 'Delete User Profile'}
        message={
          user
            ? (t.adminDeleteProfileMessage || 'Are you sure you want to delete the profile for {email}? This will permanently delete the profile and all course registrations. This action cannot be undone.')
                .replace('{email}', user.email || 'this user')
            : ''
        }
        confirmText={t.adminDeleteConfirm || 'Delete'}
        cancelText={t.cancel || 'Cancel'}
        language={language}
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
