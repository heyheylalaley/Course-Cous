import React, { useState, useEffect } from 'react';
import { CourseCategory, Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { db } from '../services/db';
import { 
  X, Save, Plus, Trash2, Edit2, FolderOpen, Loader2,
  // All available icons for selection
  BookOpen, Shield, Coffee, Users, Globe, HardHat, Warehouse, Sparkles, HeartPulse,
  Cpu, Briefcase, ShoppingBag, Scissors, Baby, Leaf, Car, Heart, TreePine,
  GraduationCap, Hammer, Wrench, Utensils, Camera, Music, Palette, Plane,
  Ship, Train, Bus, Bike, Building, Home, Hotel, Store, Factory, Landmark,
  Church, Hospital, School, Library, Theater, Film, Tv, Radio, Mic, Headphones,
  Smartphone, Laptop, Monitor, Printer, Server, Database, Cloud, Wifi, Lock,
  Key, CreditCard, Wallet, PiggyBank, TrendingUp, BarChart, PieChart, Activity,
  Thermometer, Stethoscope, Pill, Syringe, Microscope, FlaskConical, Atom,
  Beaker, TestTube, Dna, Brain, Eye, Ear, Hand, Footprints, Dog, Cat, Fish,
  Bird, Bug, Flower, Sun, Moon, Star, Snowflake, Wind, Droplet, Flame,
  Zap, Battery, Plug, Lightbulb, Fan, AirVent, CircuitBoard, Cog, Settings,
  Tool, Hammer as HammerIcon, Axe, Shovel, Pickaxe, Gem, Crown, Award, Medal,
  Trophy, Flag, Target, Crosshair, Compass, Map, Navigation, Signpost,
  Clock, Calendar, Timer, Hourglass, Bell, BellRing, Megaphone, MessageCircle,
  Mail, Send, Inbox, Archive, Bookmark, Tag, Hash, AtSign, Link, Paperclip,
  FileText, File, Folder, FolderOpen as FolderOpenIcon, Image, Video, 
  Volume2, Play, Pause, Square, Circle, Triangle, Pentagon, Hexagon, Octagon,
  ArrowRight, ArrowLeft, ArrowUp, ArrowDown, RefreshCw, RotateCw, Maximize,
  Minimize, ZoomIn, ZoomOut, Search, Filter, SlidersHorizontal, LayoutGrid,
  List, Menu, MoreHorizontal, MoreVertical, Info, HelpCircle, AlertTriangle,
  AlertCircle, CheckCircle, XCircle, PlusCircle, MinusCircle, Ban, ShieldCheck,
  ShieldAlert, UserCheck, UserPlus, UserMinus, Users as UsersIcon, UserCircle,
  Contact, Phone, PhoneCall, Video as VideoIcon, Voicemail, Gift, Package,
  Box, Truck, Forklift, Container, Anchor, Rocket, Satellite, Globe2,
  Earth, Mountain, Trees, Tent, Campfire, Umbrella, UmbrellaOff, Shirt,
  Watch, Glasses, Backpack, Luggage, Sofa, Bed, Bath, Toilet, Brush,
  Spray, Trash, Recycle, Leaf as LeafIcon, Sprout, Apple, Carrot, Wheat,
  Grape, Cherry, Banana, Pizza, Sandwich, Soup, IceCream, Cake, Cookie,
  Wine, Beer, CoffeeIcon, Tea
} from 'lucide-react';

// Map icon names to components
const AVAILABLE_ICONS: Record<string, React.ComponentType<any>> = {
  BookOpen, Shield, Coffee, Users, Globe, HardHat, Warehouse, Sparkles, HeartPulse,
  Cpu, Briefcase, ShoppingBag, Scissors, Baby, Leaf, Car, Heart, TreePine,
  GraduationCap, Hammer, Wrench, Utensils, Camera, Music, Palette, Plane,
  Ship, Train, Bus, Bike, Building, Home, Hotel, Store, Factory, Landmark,
  Church, Hospital, School, Library, Theater, Film, Tv, Radio, Mic, Headphones,
  Smartphone, Laptop, Monitor, Printer, Server, Database, Cloud, Wifi, Lock,
  Key, CreditCard, Wallet, PiggyBank, TrendingUp, BarChart, PieChart, Activity,
  Thermometer, Stethoscope, Pill, Syringe, Microscope, FlaskConical, Atom,
  Beaker, TestTube, Dna, Brain, Eye, Ear, Hand, Footprints, Dog, Cat, Fish,
  Bird, Bug, Flower, Sun, Moon, Star, Snowflake, Wind, Droplet, Flame,
  Zap, Battery, Plug, Lightbulb, Fan, AirVent, CircuitBoard, Cog, Settings,
  Tool, Axe, Shovel, Pickaxe, Gem, Crown, Award, Medal,
  Trophy, Flag, Target, Crosshair, Compass, Map, Navigation, Signpost,
  Clock, Calendar, Timer, Hourglass, Bell, BellRing, Megaphone, MessageCircle,
  Mail, Send, Inbox, Archive, Bookmark, Tag, Hash, AtSign, Link, Paperclip,
  FileText, File, Folder, FolderOpen, Image, Video, 
  Volume2, Play, Pause, Square, Circle, Triangle, Pentagon, Hexagon, Octagon,
  RefreshCw, RotateCw, Maximize, Minimize, ZoomIn, ZoomOut, Search, Filter, 
  SlidersHorizontal, LayoutGrid, List, Menu, Info, HelpCircle, AlertTriangle,
  AlertCircle, CheckCircle, XCircle, PlusCircle, MinusCircle, Ban, ShieldCheck,
  ShieldAlert, UserCheck, UserPlus, UserMinus, UserCircle,
  Contact, Phone, PhoneCall, Voicemail, Gift, Package,
  Box, Truck, Forklift, Container, Anchor, Rocket, Satellite, Globe2,
  Earth, Mountain, Trees, Tent, Campfire, Umbrella, UmbrellaOff, Shirt,
  Watch, Glasses, Backpack, Luggage, Sofa, Bed, Bath, Toilet, Brush,
  Spray, Trash, Recycle, Sprout, Apple, Carrot, Wheat,
  Grape, Cherry, Banana, Pizza, Sandwich, Soup, IceCream, Cake, Cookie,
  Wine, Beer
};

// Available colors
const AVAILABLE_COLORS = [
  { name: 'Red', value: 'text-red-500' },
  { name: 'Orange', value: 'text-orange-500' },
  { name: 'Amber', value: 'text-amber-500' },
  { name: 'Yellow', value: 'text-yellow-500' },
  { name: 'Lime', value: 'text-lime-500' },
  { name: 'Green', value: 'text-green-500' },
  { name: 'Emerald', value: 'text-emerald-500' },
  { name: 'Teal', value: 'text-teal-500' },
  { name: 'Cyan', value: 'text-cyan-500' },
  { name: 'Sky', value: 'text-sky-500' },
  { name: 'Blue', value: 'text-blue-500' },
  { name: 'Indigo', value: 'text-indigo-500' },
  { name: 'Violet', value: 'text-violet-500' },
  { name: 'Purple', value: 'text-purple-500' },
  { name: 'Fuchsia', value: 'text-fuchsia-500' },
  { name: 'Pink', value: 'text-pink-500' },
  { name: 'Rose', value: 'text-rose-500' },
  { name: 'Slate', value: 'text-slate-500' },
  { name: 'Gray', value: 'text-gray-500' },
];

interface AdminCategoryManagementProps {
  language: Language;
}

export const AdminCategoryManagement: React.FC<AdminCategoryManagementProps> = ({ language }) => {
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<CourseCategory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [iconSearch, setIconSearch] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('BookOpen');
  const [formColor, setFormColor] = useState('text-gray-500');

  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await db.getCategories();
      setCategories(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormIcon('BookOpen');
    setFormColor('text-gray-500');
    setIconSearch('');
    setIsModalOpen(true);
  };

  const openEditModal = (category: CourseCategory) => {
    setEditingCategory(category);
    setFormName(category.name);
    setFormIcon(category.icon);
    setFormColor(category.color);
    setIconSearch('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setError('Category name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const categoryId = formName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      if (editingCategory) {
        await db.updateCategory(editingCategory.id, {
          name: formName.trim(),
          icon: formIcon,
          color: formColor
        });
      } else {
        await db.createCategory({
          id: categoryId,
          name: formName.trim(),
          icon: formIcon,
          color: formColor,
          sortOrder: categories.length + 1
        });
      }

      await loadCategories();
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (category: CourseCategory) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await db.deleteCategory(category.id);
      await loadCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
    }
  };

  const renderIcon = (iconName: string, className: string = "w-5 h-5") => {
    const IconComponent = AVAILABLE_ICONS[iconName];
    if (IconComponent) {
      return <IconComponent className={className} />;
    }
    return <BookOpen className={className} />;
  };

  const filteredIcons = Object.keys(AVAILABLE_ICONS).filter(name =>
    name.toLowerCase().includes(iconSearch.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t.adminCategoryManagement || 'Category Management'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t.adminCategoryManagementDesc || 'Add, edit, and manage course categories'}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t.adminAddCategory || 'Add Category'}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Categories list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 ${category.color}`}>
                {renderIcon(category.icon, "w-5 h-5")}
              </div>
              <span className="font-medium text-gray-900 dark:text-white">{category.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openEditModal(category)}
                className="p-2 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                title={t.adminEditCategory || 'Edit'}
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(category)}
                className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                title={t.adminDeleteCategory || 'Delete'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{t.adminNoCategories || 'No categories found. Add your first category!'}</p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingCategory ? (t.adminEditCategory || 'Edit Category') : (t.adminAddCategory || 'Add Category')}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Category Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.adminCategoryName || 'Category Name'} *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Technology"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none"
                />
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.adminCategoryColor || 'Color'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setFormColor(color.value)}
                      className={`w-8 h-8 rounded-full ${color.value.replace('text-', 'bg-')} transition-transform ${
                        formColor === color.value ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.adminCategoryIcon || 'Icon'}
                </label>
                
                {/* Search */}
                <input
                  type="text"
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                  placeholder={t.adminSearchIcons || 'Search icons...'}
                  className="w-full px-4 py-2 mb-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />

                {/* Selected Icon Preview */}
                <div className="flex items-center gap-3 mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 ${formColor}`}>
                    {renderIcon(formIcon, "w-6 h-6")}
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {t.adminSelectedIcon || 'Selected'}: <strong>{formIcon}</strong>
                  </span>
                </div>

                {/* Icon Grid */}
                <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  {filteredIcons.map((iconName) => (
                    <button
                      key={iconName}
                      onClick={() => setFormIcon(iconName)}
                      className={`p-2 rounded-lg transition-colors ${
                        formIcon === iconName
                          ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                          : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
                      }`}
                      title={iconName}
                    >
                      {renderIcon(iconName, "w-5 h-5")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !formName.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Export the icon map for use in other components
export { AVAILABLE_ICONS };
