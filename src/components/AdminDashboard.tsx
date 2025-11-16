import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Upload, 
  Settings, 
  X,
  Users,
  Download,
  Star,
  Plus,
  Edit,
  Trash2,
  Sparkles,
  CheckCircle,
  XCircle,
  Shield,
  Save
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { VocabularyInputAdvanced, VocabularyItem } from './VocabularyInputAdvanced';

interface AdminDashboardProps {
  onClose: () => void;
}

type AdminScreen = 'overview' | 'vocabularies' | 'upload' | 'users' | 'categories';

export function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [currentScreen, setCurrentScreen] = useState<AdminScreen>('overview');

  return (
    <div className="fixed inset-0 z-[100] bg-gray-50">
      <div className="h-full flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg" style={{ fontWeight: 700, color: '#491B6D' }}>
                  Admin Panel
                </h2>
                <p className="text-xs text-gray-500 mt-1">JEJEVOCA Dashboard</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </motion.button>
            </div>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <SidebarButton
              icon={<LayoutDashboard className="w-5 h-5" />}
              label="Overview"
              active={currentScreen === 'overview'}
              onClick={() => setCurrentScreen('overview')}
            />
            <SidebarButton
              icon={<BookOpen className="w-5 h-5" />}
              label="Vocabularies"
              active={currentScreen === 'vocabularies'}
              onClick={() => setCurrentScreen('vocabularies')}
            />
            <SidebarButton
              icon={<Upload className="w-5 h-5" />}
              label="Create Vocabulary"
              active={currentScreen === 'upload'}
              onClick={() => setCurrentScreen('upload')}
            />
            <SidebarButton
              icon={<Users className="w-5 h-5" />}
              label="User Management"
              active={currentScreen === 'users'}
              onClick={() => setCurrentScreen('users')}
            />
            <SidebarButton
              icon={<Settings className="w-5 h-5" />}
              label="Categories"
              active={currentScreen === 'categories'}
              onClick={() => setCurrentScreen('categories')}
            />
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              © JEJETRANSFER 2025
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {currentScreen === 'overview' && <OverviewScreen />}
          {currentScreen === 'vocabularies' && <VocabulariesScreen />}
          {currentScreen === 'upload' && <UploadScreen />}
          {currentScreen === 'users' && <UsersScreen />}
          {currentScreen === 'categories' && <CategoriesScreen />}
        </div>
      </div>
    </div>
  );
}

// Sidebar Button Component
function SidebarButton({ 
  icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
        active 
          ? 'bg-[#491B6D] text-white' 
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span style={{ fontSize: '14px', fontWeight: 600 }}>{label}</span>
    </motion.button>
  );
}

// Overview Screen
function OverviewScreen() {
  const [stats, setStats] = useState({
    totalVocabularies: 0,
    totalDownloads: 0,
    activeUsers: 0,
    avgRating: '0.0',
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/stats`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const data = await response.json();
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl mb-2" style={{ fontWeight: 700, color: '#491B6D' }}>
          Dashboard Overview
        </h1>
        <p className="text-gray-600">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<BookOpen className="w-6 h-6" />}
          label="Total Vocabularies"
          value={stats.totalVocabularies.toString()}
          change="+12%"
          positive
          color="#8B5CF6"
        />
        <StatCard
          icon={<Download className="w-6 h-6" />}
          label="Total Downloads"
          value={stats.totalDownloads.toString()}
          change="+0.3%"
          positive
          color="#7C3AED"
        />
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Active Users"
          value={stats.activeUsers.toString()}
          change="+6.08%"
          positive
          color="#6D28D9"
        />
        <StatCard
          icon={<Star className="w-6 h-6" />}
          label="Avg Rating"
          value={stats.avgRating}
          change="+0.2"
          positive
          color="#5B21B6"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Main Chart */}
        <div className="col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#491B6D' }}>
                Downloads Trend
              </h3>
              <p className="text-sm text-gray-500 mt-1">Last 6 months</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#8B5CF6]"></div>
                <span className="text-xs text-gray-600">This year</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                <span className="text-xs text-gray-600">Last year</span>
              </div>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-3">
            {[30, 45, 60, 80, 55, 70].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col gap-2">
                <div 
                  className="w-full rounded-t-lg bg-gradient-to-t from-[#8B5CF6] to-[#A78BFA] transition-all"
                  style={{ height: `${height}%` }}
                />
                <div 
                  className="w-full rounded-t-lg bg-gray-200"
                  style={{ height: `${height * 0.7}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Side Stats */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h3 className="mb-6" style={{ fontSize: '16px', fontWeight: 600, color: '#491B6D' }}>
            Top Categories
          </h3>
          <div className="space-y-4">
            <CategoryItem label="TOEIC" percentage={52.1} color="#8B5CF6" />
            <CategoryItem label="SAT" percentage={22.8} color="#A78BFA" />
            <CategoryItem label="GRE" percentage={13.9} color="#C4B5FD" />
            <CategoryItem label="School" percentage={8.2} color="#DDD6FE" />
            <CategoryItem label="General" percentage={3.0} color="#EDE9FE" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Vocabularies Screen
function VocabulariesScreen() {
  const [vocabularies, setVocabularies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVocabularies();
  }, []);

  const loadVocabularies = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/shared-vocabularies`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const data = await response.json();
      if (data.vocabularies) {
        setVocabularies(data.vocabularies);
      }
    } catch (error) {
      console.error('Error loading vocabularies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vocabId: string) => {
    if (!confirm('정말 이 단어장을 삭제하시겠습니까?')) return;
    
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/shared-vocabularies/${vocabId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      await loadVocabularies();
    } catch (error) {
      console.error('Error deleting vocabulary:', error);
      alert('삭제 실패했습니다.');
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl mb-2" style={{ fontWeight: 700, color: '#491B6D' }}>
            Vocabulary Management
          </h1>
          <p className="text-gray-600">Manage all shared vocabulary lists</p>
        </div>
      </div>

      {/* Vocabulary Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : vocabularies.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            단어장이 없습니다. "Create Vocabulary" 탭에서 새 단어장을 만들어주세요.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  Title
                </th>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  Category
                </th>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  Level
                </th>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  Words
                </th>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  Downloads
                </th>
                <th className="px-6 py-4 text-right text-xs text-gray-600 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {vocabularies.map((vocab) => (
                <VocabularyRow 
                  key={vocab.id}
                  title={vocab.title}
                  category={vocab.category}
                  level={vocab.level}
                  words={vocab.words?.length || 0}
                  downloads={vocab.downloads || 0}
                  onDelete={() => handleDelete(vocab.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Upload Screen - Excel Style Input

function UploadScreen() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('Beginner');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [vocabularyItems, setVocabularyItems] = useState<VocabularyItem[]>([]);
  const [headerInfo, setHeaderInfo] = useState({ headerTitle: '', headerDescription: '' });
  const [tokenInfo, setTokenInfo] = useState<{ inputTokens: number; outputTokens: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/server/admin/categories`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );
        const data = await response.json();
        if (data.categories) {
          const enabled = data.categories.filter((c: any) => c.enabled);
          setCategories(enabled);
          if (enabled.length > 0) {
            setCategory(enabled[0].name);
          }
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    loadCategories();
  }, []);

  const handleSaveSharedVocabulary = async () => {
    if (!title.trim()) {
      toast.error('Title을 입력해주세요.');
      return;
    }
    if (!category) {
      toast.error('Category를 선택해주세요.');
      return;
    }
    if (vocabularyItems.length === 0) {
      toast.error('먼저 단어를 입력하거나 생성해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/shared-vocabularies`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            title,
            category,
            level,
            description,
            words: vocabularyItems
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '단어장 저장에 실패했습니다.');
      }

      toast.success('공유 단어장이 생성되었습니다!');
      setTitle('');
      setDescription('');
      setVocabularyItems([]);
      setHeaderInfo({ headerTitle: '', headerDescription: '' });
    } catch (error: any) {
      console.error('Failed to save shared vocabulary:', error);
      toast.error(error?.message || '단어장 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6 overflow-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-[#491B6D]">단어장 기본 정보</h2>
          <p className="text-sm text-gray-500">관리자 전용 세부 설정을 입력해주세요.</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: JEJE 필수 어휘 100"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="" disabled>
                카테고리를 선택해주세요
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="간단한 소개를 입력하세요"
              className="w-full px-3 py-2 border rounded-lg h-24"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#491B6D]">단어 입력 & AI 생성</h3>
            <p className="text-sm text-gray-500">CSV 붙여넣기, 직접 입력, AI 자동 생성 모두 지원합니다.</p>
          </div>
        </div>
        <VocabularyInputAdvanced
          fullscreen
          data={vocabularyItems}
          headerInfo={headerInfo}
          onHeaderChange={setHeaderInfo}
          onChange={setVocabularyItems}
          onSave={(items, usage) => {
            setVocabularyItems(items);
            if (usage) setTokenInfo(usage);
            toast.success(`${items.length}개 단어가 생성되었습니다.`);
          }}
        />
      </div>

      {tokenInfo && (
        <div className="bg-[#F4EEFF] border border-[#E0D4FF] rounded-2xl p-4 text-sm text-gray-600">
          📊 최근 AI 생성 토큰 사용량 — 입력 {tokenInfo.inputTokens.toLocaleString()} / 출력 {tokenInfo.outputTokens.toLocaleString()}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSaveSharedVocabulary}
          disabled={isSaving}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#491B6D] to-[#5E2278] text-white font-semibold shadow-lg disabled:opacity-50"
        >
          {isSaving ? '저장 중...' : '공유 단어장 저장하기'}
        </button>
      </div>
    </div>
  );
}
function UsersScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/users`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const data = await response.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermissions = async (userId: string, role: string, permissions: string[]) => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/users/${userId}/permissions`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ role, permissions }),
        }
      );
      await loadUsers();
    } catch (error) {
      console.error('Error updating permissions:', error);
      alert('권한 업데이트 실패');
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl mb-2" style={{ fontWeight: 700, color: '#491B6D' }}>
          User Management
        </h1>
        <p className="text-gray-600">Manage users and their permissions</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  Stats
                </th>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  Last Active
                </th>
                <th className="px-6 py-4 text-right text-xs text-gray-600 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <UserRow 
                  key={user.id}
                  user={user}
                  onUpdatePermissions={handleUpdatePermissions}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Categories Screen with Edit Functionality
function CategoriesScreen() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({ name: '', icon: '📚' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/categories`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const data = await response.json();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      alert('카테고리 이름을 입력해주세요.');
      return;
    }

    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/categories`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            id: newCategory.name.toLowerCase().replace(/\s+/g, '_'),
            name: newCategory.name,
            icon: newCategory.icon,
            enabled: true,
          }),
        }
      );
      await loadCategories();
      setNewCategory({ name: '', icon: '📚' });
    } catch (error) {
      console.error('Error adding category:', error);
      alert('카테고리 추가 실패');
    }
  };

  const handleStartEdit = (category: any) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditIcon(category.icon);
  };

  const handleSaveEdit = async (categoryId: string) => {
    if (!editName.trim()) {
      alert('카테고리 이름을 입력해주세요.');
      return;
    }

    try {
      const updatedCategories = categories.map(cat => 
        cat.id === categoryId 
          ? { ...cat, name: editName, icon: editIcon }
          : cat
      );
      
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/categories`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ categories: updatedCategories }),
        }
      );
      await loadCategories();
      setEditingId(null);
    } catch (error) {
      console.error('Error updating category:', error);
      alert('카테고리 업데이트 실패');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditIcon('');
  };

  const handleToggleCategory = async (categoryId: string, currentEnabled: boolean) => {
    try {
      const updatedCategories = categories.map(cat => 
        cat.id === categoryId ? { ...cat, enabled: !currentEnabled } : cat
      );
      
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/categories`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ categories: updatedCategories }),
        }
      );
      await loadCategories();
    } catch (error) {
      console.error('Error toggling category:', error);
      alert('카테고리 업데이트 실패');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('정말 이 카테고리를 삭제하시겠습니까?')) return;

    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/categories/${categoryId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      await loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('카테고리 삭제 실패');
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl mb-2" style={{ fontWeight: 700, color: '#491B6D' }}>
            Category Management
          </h1>
          <p className="text-gray-600">카테고리 관리 (동적으로 선물 탭과 연동됩니다)</p>
        </div>

        {/* Add New Category */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-6">
          <h3 className="mb-4" style={{ fontSize: '16px', fontWeight: 600, color: '#491B6D' }}>
            Add New Category
          </h3>
          <div className="flex gap-4">
            <input
              type="text"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              placeholder="Category Name"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/30"
            />
            <input
              type="text"
              value={newCategory.icon}
              onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
              placeholder="Icon (emoji)"
              className="w-24 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/30 text-center"
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleAddCategory}
              className="px-6 py-3 bg-[#491B6D] text-white rounded-xl flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span style={{ fontWeight: 600 }}>Add</span>
            </motion.button>
          </div>
        </div>

        {/* Categories List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {categories.map((category) => (
                <div key={category.id} className="p-6 flex items-center justify-between">
                  {editingId === category.id ? (
                    // Edit Mode
                    <div className="flex-1 flex items-center gap-4">
                      <input
                        type="text"
                        value={editIcon}
                        onChange={(e) => setEditIcon(e.target.value)}
                        className="w-16 px-3 py-2 rounded-lg border border-gray-300 text-center text-2xl"
                      />
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/30"
                        style={{ fontWeight: 600, color: '#491B6D' }}
                      />
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSaveEdit(category.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
                        >
                          Cancel
                        </motion.button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">{category.icon}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#491B6D' }}>{category.name}</div>
                          <div className="text-sm text-gray-500">ID: {category.id}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleStartEdit(category)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleToggleCategory(category.id, category.enabled)}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            category.enabled 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {category.enabled ? 'Enabled' : 'Disabled'}
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDeleteCategory(category.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </motion.button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ 
  icon, 
  label, 
  value, 
  change, 
  positive, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  change: string; 
  positive: boolean; 
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {icon}
        </div>
        <span className={`text-sm ${positive ? 'text-green-600' : 'text-red-600'}`} style={{ fontWeight: 600 }}>
          {change}
        </span>
      </div>
      <div className="text-2xl mb-1" style={{ fontWeight: 700, color: '#491B6D' }}>
        {value}
      </div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

function CategoryItem({ label, percentage, color }: { label: string; percentage: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>{label}</span>
        <span className="text-sm text-gray-600">{percentage}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function VocabularyRow({ 
  title, 
  category, 
  level, 
  words, 
  downloads,
  onDelete
}: { 
  title: string; 
  category: string; 
  level: string; 
  words: number; 
  downloads: number;
  onDelete: () => void;
}) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{title}</div>
      </td>
      <td className="px-6 py-4">
        <span className="px-3 py-1 rounded-full text-xs bg-[#8B5CF6]/10 text-[#8B5CF6]" style={{ fontWeight: 600 }}>
          {category}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className="text-sm text-gray-600">{level}</span>
      </td>
      <td className="px-6 py-4">
        <span className="text-sm text-gray-600">{words.toLocaleString()}</span>
      </td>
      <td className="px-6 py-4">
        <span className="text-sm text-gray-600">{downloads.toLocaleString()}</span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onDelete}
            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </motion.button>
        </div>
      </td>
    </tr>
  );
}

function UserRow({ 
  user,
  onUpdatePermissions
}: { 
  user: any;
  onUpdatePermissions: (userId: string, role: string, permissions: string[]) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [role, setRole] = useState(user.role);

  const handleSave = () => {
    onUpdatePermissions(user.id, role, user.permissions);
    setIsEditing(false);
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4">
        <div>
          <div className="text-sm" style={{ fontWeight: 600, color: '#491B6D' }}>{user.name}</div>
          <div className="text-xs text-gray-500">{user.email}</div>
        </div>
      </td>
      <td className="px-6 py-4">
        {isEditing ? (
          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value)}
            className="px-3 py-1 rounded-lg border border-gray-300 text-sm"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        ) : (
          <span className={`px-3 py-1 rounded-full text-xs ${
            user.role === 'admin' 
              ? 'bg-purple-100 text-purple-700' 
              : 'bg-gray-100 text-gray-700'
          }`} style={{ fontWeight: 600 }}>
            {user.role}
          </span>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="text-xs text-gray-600 space-y-1">
          <div>단어장: {user.stats?.vocabulariesCreated || 0}</div>
          <div>퀴즈: {user.stats?.quizzesCompleted || 0}</div>
          <div>XP: {user.stats?.xp || 0}</div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="text-sm text-gray-600">
          {new Date(user.lastActive).toLocaleDateString()}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          {isEditing ? (
            <>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                className="p-2 hover:bg-green-50 rounded-lg transition-colors"
              >
                <CheckCircle className="w-4 h-4 text-green-600" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setIsEditing(false);
                  setRole(user.role);
                }}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
              >
                <XCircle className="w-4 h-4 text-red-500" />
              </motion.button>
            </>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsEditing(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Shield className="w-4 h-4 text-gray-600" />
            </motion.button>
          )}
        </div>
      </td>
    </tr>
  );
}
