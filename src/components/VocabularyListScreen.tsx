import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronDown,
  MoreVertical,
  Edit2,
  Trash2,
  PlayCircle
} from 'lucide-react';
import { BackButton } from './BackButton';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface VocabularyListScreenProps {
  onBack: () => void;
  onSelectVocabulary: (vocabularyId: string, vocabularyTitle: string) => void;
  onStartFlashcards?: (vocabularyId: string, vocabularyTitle: string) => void;
  getAuthToken?: () => string;
}

interface VocabularyItem {
  id: string;
  title: string;
  wordCount: number;
  estimatedTime: string;
  isCompleted: boolean;
  progress?: number;
}

interface VocabularyUnit {
  id: string;
  title: string;
  subtitle: string;
  progress: number;
  items: VocabularyItem[];
  isExpanded: boolean;
}

export function VocabularyListScreen({ onBack, onSelectVocabulary, onStartFlashcards, getAuthToken }: VocabularyListScreenProps) {
  const [units, setUnits] = useState<VocabularyUnit[]>([]);
  const [myOwnVocabularies, setMyOwnVocabularies] = useState<any[]>([]);
  const [myOwnExpanded, setMyOwnExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Edit/Delete dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVocab, setSelectedVocab] = useState<VocabularyItem | null>(null);
  const [newVocabName, setNewVocabName] = useState('');

  // Load all vocabularies - both shared and My Own
  useEffect(() => {
    const loadAllVocabularies = async () => {
      setIsLoading(true);
      try {
        // Load both APIs in parallel for faster loading
        const [userResponse, sharedResponse] = await Promise.all([
          fetch(
            `https://${projectId}.supabase.co/functions/v1/server/user-vocabularies`,
            {
              headers: {
                'Authorization': `Bearer ${getAuthToken ? getAuthToken() : publicAnonKey}`
              }
            }
          ),
          fetch(
            `https://${projectId}.supabase.co/functions/v1/server/shared-vocabularies`,
            {
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`
              }
            }
          )
        ]);

        if (userResponse.ok) {
          const userData = await userResponse.json();
          // ✅ All user_vocabularies are "My Own" - no need to filter
          setMyOwnVocabularies(userData.vocabularies || []);
          console.log('✅ Loaded My Own vocabularies:', userData.vocabularies?.length || 0);
        } else {
          console.error('❌ Failed to load user vocabularies:', await userResponse.text());
        }

        if (sharedResponse.ok) {
          const sharedData = await sharedResponse.json();
          // Group shared vocabularies by category
          const groupedByCategory: { [key: string]: any[] } = {};
          
          sharedData.vocabularies.forEach((vocab: any) => {
            const category = vocab.category || '기타';
            if (!groupedByCategory[category]) {
              groupedByCategory[category] = [];
            }
            groupedByCategory[category].push(vocab);
          });

          // Convert to VocabularyUnit format
          const sharedUnits: VocabularyUnit[] = Object.entries(groupedByCategory).map(([category, vocabs]) => ({
            id: category,
            title: category,
            subtitle: `${vocabs.length}개 단어장`,
            progress: 0,
            isExpanded: false,
            items: vocabs.map((vocab: any) => ({
              id: vocab.id,
              title: vocab.title,
              wordCount: vocab.totalWords || 0,
              estimatedTime: `${Math.ceil((vocab.totalWords || 0) / 3)} min`,
              isCompleted: false,
              progress: 0
            }))
          }));

          setUnits(sharedUnits);
          console.log('Loaded shared vocabularies:', sharedUnits.length, 'categories');
        }
      } catch (error) {
        console.error('Failed to load vocabularies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllVocabularies();
  }, []);

  // Create "My Own" unit dynamically (always show, even if empty)
  const myOwnUnit: VocabularyUnit = {
    id: 'my-own',
    title: 'My Own',
    subtitle: '나만의 단어장',
    progress: 0,
    isExpanded: myOwnExpanded,
    items: myOwnVocabularies.map((vocab: any) => ({
      id: vocab.id,
      title: vocab.title,
      wordCount: vocab.total_words || 0,
      estimatedTime: `${Math.ceil((vocab.total_words || 0) / 3)} min`,
      isCompleted: false,
      progress: 0
    }))
  };

  // Combine all units (My Own at the top)
  const allUnits = [myOwnUnit, ...units];

  const toggleUnit = (unitId: string) => {
    if (unitId === 'my-own') {
      // Toggle My Own unit
      setMyOwnExpanded(!myOwnExpanded);
    } else {
      setUnits(prevUnits =>
        prevUnits.map(unit =>
          unit.id === unitId ? { ...unit, isExpanded: !unit.isExpanded } : unit
        )
      );
    }
  };

  const handleVocabularyClick = (item: VocabularyItem) => {
    onSelectVocabulary(item.id, item.title);
  };

  // Handle edit vocabulary name
  const handleEdit = (item: VocabularyItem, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent item click
    setSelectedVocab(item);
    setNewVocabName(item.title);
    setEditDialogOpen(true);
  };

  // Handle delete vocabulary
  const handleDelete = (item: VocabularyItem, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent item click
    setSelectedVocab(item);
    setDeleteDialogOpen(true);
  };

  // Confirm edit
  const confirmEdit = async () => {
    if (!selectedVocab || !newVocabName.trim()) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/user-vocabularies/${selectedVocab.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${getAuthToken ? getAuthToken() : publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title: newVocabName.trim() })
        }
      );

      if (response.ok) {
        // Update local state
        setMyOwnVocabularies(prev =>
          prev.map(vocab =>
            vocab.id === selectedVocab.id
              ? { ...vocab, title: newVocabName.trim() }
              : vocab
          )
        );
        setEditDialogOpen(false);
        setSelectedVocab(null);
        setNewVocabName('');
        console.log('Vocabulary renamed successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to rename vocabulary:', errorData);
        alert('이름 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error renaming vocabulary:', error);
      alert('이름 변경 중 오류가 발생했습니다.');
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!selectedVocab) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/user-vocabularies/${selectedVocab.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${getAuthToken ? getAuthToken() : publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        // Update local state
        setMyOwnVocabularies(prev =>
          prev.filter(vocab => vocab.id !== selectedVocab.id)
        );
        setDeleteDialogOpen(false);
        setSelectedVocab(null);
        console.log('Vocabulary deleted successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to delete vocabulary:', errorData);
        alert('삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error deleting vocabulary:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#D4C5FF] to-[#E5D9FF]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40" style={{ background: 'transparent' }}>
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4">
          <BackButton onClick={onBack} />

          <h1 className="text-[#091A7A]" style={{ fontSize: '18px', fontWeight: 600 }}>
            단어장 목록
          </h1>

          <div className="w-12 h-12" />
        </div>
      </div>

      {/* Vocabulary Units List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[#491B6D]" style={{ fontSize: '14px', fontWeight: 500 }}>
                단어장 불러오는 중...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 pt-2">
            {allUnits.map((unit, unitIndex) => (
              <div key={unit.id}>
                {/* Unit Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: unitIndex * 0.1 }}
                  className="bg-white/95 backdrop-blur-lg rounded-2xl overflow-hidden shadow-lg"
                >
                  {/* Unit Header - Clickable */}
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleUnit(unit.id)}
                    className="p-4"
                  >
                    <div className="flex items-center justify-between">
                      {/* Unit Info */}
                      <div className="flex-1">
                        <h3 className="text-[#091A7A] mb-1" style={{ fontSize: '16px', fontWeight: 600 }}>
                          {unit.title}
                        </h3>
                        <span className="inline-block text-[#8B5CF6]" style={{ fontSize: '11px', fontWeight: 500 }}>
                          {unit.items.reduce((sum, item) => sum + item.wordCount, 0)} words
                        </span>
                      </div>

                      {/* Progress % and Expand Icon */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[#8B5CF6]" style={{ fontSize: '12px', fontWeight: 600 }}>
                          {unit.progress}%
                        </span>
                        <motion.div
                          animate={{ rotate: unit.isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ChevronDown className="w-5 h-5 text-[#091A7A]" />
                        </motion.div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2.5">
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${unit.progress}%` }}
                          transition={{ duration: 0.8, delay: unitIndex * 0.1 + 0.2 }}
                          className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] rounded-full"
                        />
                      </div>
                    </div>
                  </motion.div>

                  {/* Unit Items - Expandable */}
                  {unit.isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-gray-200/50"
                    >
                      <div className="p-2 space-y-1.5">
                        {unit.items.map((item, itemIndex) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: itemIndex * 0.05 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleVocabularyClick(item)}
                            className="bg-white/80 backdrop-blur-sm rounded-xl p-3 flex items-center gap-2.5"
                          >
                            {/* Item Number */}
                            <div className="w-7 h-7 bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-white" style={{ fontSize: '12px', fontWeight: 600 }}>
                                {itemIndex + 1}
                              </span>
                            </div>

                            {/* Item Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[#091A7A]" style={{ fontSize: '14px', fontWeight: 600 }}>
                                {item.title}
                              </h4>
                              <span className="text-[#6B7280]" style={{ fontSize: '11px' }}>
                                {item.wordCount} words
                              </span>
                            </div>

                            {/* Flashcard Start Button */}
                            <div className="flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onStartFlashcards) {
                                    onStartFlashcards(item.id, item.title);
                                  }
                                }}
                                className="p-1.5 hover:bg-purple-100 rounded-lg transition-colors"
                                title="플래시카드 시작"
                              >
                                <PlayCircle className="w-5 h-5 text-[#8B5CF6]" />
                              </button>
                            </div>

                            {/* Edit/Delete Buttons */}
                            {unit.id === 'my-own' && (
                              <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                                      <MoreVertical className="w-5 h-5 text-[#8B5CF6]" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-40 p-2">
                                    <div className="space-y-1">
                                      <button 
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                                        onClick={(e) => handleEdit(item, e)}
                                      >
                                        <Edit2 className="w-4 h-4 text-[#8B5CF6]" />
                                        <span className="text-[#8B5CF6]" style={{ fontSize: '14px', fontWeight: 500 }}>이름 변경</span>
                                      </button>
                                      <button 
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                                        onClick={(e) => handleDelete(item, e)}
                                      >
                                        <Trash2 className="w-4 h-4 text-[#EF4444]" />
                                        <span className="text-[#EF4444]" style={{ fontSize: '14px', fontWeight: 500 }}>삭제</span>
                                      </button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Vocabulary Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>단어장 이름 변경</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              id="name"
              value={newVocabName}
              onChange={(e) => setNewVocabName(e.target.value)}
              placeholder="새로운 이름"
            />
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setEditDialogOpen(false)}>
              취소
            </Button>
            <Button type="button" onClick={confirmEdit}>
              변경
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Vocabulary Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>단어장 삭제</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-[#491B6D]">정말로 이 단어장을 삭제하시겠습니까?</p>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button type="button" onClick={confirmDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}