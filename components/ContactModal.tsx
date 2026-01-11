import React, { useState, useEffect } from 'react';
import { X, MapPin, Phone, Mail, Globe, Clock, Loader2 } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { db } from '../services/db';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, language }) => {
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';
  const [contactInfo, setContactInfo] = useState({
    organizationName: 'Cork City Partnership',
    address: 'Heron House, Blackpool Park\nCork, T23 R50R\nIreland',
    phone: '+353 21 430 2310',
    email: 'info@partnershipcork.ie',
    website: 'www.corkcitypartnership.ie',
    openingHours: 'Monday - Friday: 9:00 AM - 5:00 PM'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadContactInfo();
    }
  }, [isOpen]);

  const loadContactInfo = async () => {
    setIsLoading(true);
    try {
      const info = await db.getContactInfo();
      setContactInfo(info);
    } catch (err) {
      console.error('Failed to load contact info:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header with Logo */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src={`${import.meta.env.BASE_URL}logo.svg`}
                alt="Cork City Partnership" 
                className="w-12 h-12 bg-white rounded-lg p-1"
              />
              <div>
                <h2 className="text-xl font-bold text-white">{contactInfo.organizationName || t.orgName}</h2>
                <p className="text-green-100 text-sm">{t.contactInfoTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contact Details */}
        <div className="p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
            </div>
          ) : (
          <>
          {/* Address */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t.contactAddress}</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-1 whitespace-pre-line">
                {contactInfo.address}
              </p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
              <Phone size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t.contactPhone}</h3>
              <a 
                href={`tel:${contactInfo.phone.replace(/\s/g, '')}`}
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm mt-1 block"
              >
                {contactInfo.phone}
              </a>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg shrink-0">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t.contactEmail}</h3>
              <a 
                href={`mailto:${contactInfo.email}`}
                className="text-purple-600 dark:text-purple-400 hover:underline text-sm mt-1 block"
              >
                {contactInfo.email}
              </a>
            </div>
          </div>

          {/* Website */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg shrink-0">
              <Globe size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t.contactWebsite}</h3>
              <a 
                href={`https://${contactInfo.website}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-orange-600 dark:text-orange-400 hover:underline text-sm mt-1 block"
              >
                {contactInfo.website}
              </a>
            </div>
          </div>

          {/* Opening Hours */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t.contactOpeningHours}</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                {contactInfo.openingHours}
              </p>
            </div>
          </div>
          </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            {t.contactClose}
          </button>
        </div>
      </div>
    </div>
  );
};
