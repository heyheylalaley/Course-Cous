import React from 'react';
import { X, MapPin, Phone, Mail, Globe, Clock } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, language }) => {
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

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
                <h2 className="text-xl font-bold text-white">{t.orgName}</h2>
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
          {/* Address */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t.contactAddress}</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                Heron House, Blackpool Park<br />
                Cork, T23 R50R<br />
                Ireland
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
                href="tel:+353214302310" 
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm mt-1 block"
              >
                +353 21 430 2310
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
                href="mailto:info@partnershipcork.ie" 
                className="text-purple-600 dark:text-purple-400 hover:underline text-sm mt-1 block"
              >
                info@partnershipcork.ie
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
                href="https://www.corkcitypartnership.ie" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-orange-600 dark:text-orange-400 hover:underline text-sm mt-1 block"
              >
                www.corkcitypartnership.ie
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
                Monday - Friday: 9:00 AM - 5:00 PM
              </p>
            </div>
          </div>
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
