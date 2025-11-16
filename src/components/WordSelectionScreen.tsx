import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Volume2, Eye, EyeOff, Undo2, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Word {
  id: string;
  word: string;
  pronunciation?: string;
  meaning: string;
  example_sentence?: string;
  order_index: number;
}

interface WordSelectionScreenProps {
  onBack: () => void;
  vocabularyId: string;
  vocabularyName: string;
  totalWords: number;
  onComplete: (selectedWordIds: string[], wordsPerUnit: number) => void;
}

export function WordSelectionScreen({
  onBack,
  vocabularyId,
  vocabularyName,
  totalWords,
  onComplete,
}: WordSelectionScreenProps) {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [removedWords, setRemovedWords] = useState<Set<string>>(new Set());
  const [revealedMeanings, setRevealedMeanings] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [wordsPerUnit, setWordsPerUnit] = useState(100);
  const [swipingWord, setSwipingWord] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  useEffect(() => {
    fetchWords();
  }, [vocabularyId]);

  const fetchWords = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/shared-vocabulary/${vocabularyId}/words`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch words');
      }

      const data = await response.json();
      setWords(data.words || []);
    } catch (error) {
      console.error('Error fetching words:', error);
      toast.error('Failed to load words');
    } finally {
      setLoading(false);
    }
  };

  const toggleMeaning = (wordId: string) => {
    setRevealedMeanings((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
      }
      return newSet;
    });
  };

  const handleTouchStart = (e: React.TouchEvent, wordId: string) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
    setSwipingWord(wordId);
  };

  const handleTouchMove = (e: React.TouchEvent, wordId: string) => {
    if (swipingWord !== wordId) return;

    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    // Determine if it's a horizontal swipe
    if (!isSwiping.current && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isSwiping.current = true;
    }

    if (isSwiping.current) {
      e.preventDefault();
      setSwipeOffset(deltaX);
    }
  };

  const handleTouchEnd = (wordId: string) => {
    if (Math.abs(swipeOffset) > 100 && isSwiping.current) {
      removeWord(wordId);
    }
    setSwipeOffset(0);
    setSwipingWord(null);
    isSwiping.current = false;
  };

  const removeWord = (wordId: string) => {
    setRemovedWords((prev) => new Set(prev).add(wordId));
    setUndoStack((prev) => [...prev, wordId]);
    setRevealedMeanings((prev) => {
      const newSet = new Set(prev);
      newSet.delete(wordId);
      return newSet;
    });
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;

    const lastRemoved = undoStack[undoStack.length - 1];
    setRemovedWords((prev) => {
      const newSet = new Set(prev);
      newSet.delete(lastRemoved);
      return newSet;
    });
    setUndoStack((prev) => prev.slice(0, -1));
  };

  const speakWord = (word: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleComplete = () => {
    const selectedWordIds = words
      .filter((word) => !removedWords.has(word.id))
      .map((word) => word.id);

    if (selectedWordIds.length === 0) {
      toast.error('Please select at least one word');
      return;
    }

    if (wordsPerUnit < 1 || wordsPerUnit > selectedWordIds.length) {
      toast.error(`Words per unit must be between 1 and ${selectedWordIds.length}`);
      return;
    }

    onComplete(selectedWordIds, wordsPerUnit);
  };

  const visibleWords = words.filter((word) => !removedWords.has(word.id));
  const totalUnits = Math.ceil(visibleWords.length / wordsPerUnit);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-[#D4C5FF] to-[#E5D9FF]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#091A7A]/70">Loading words...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#D4C5FF] to-[#E5D9FF]">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-lg border-b border-white/20 p-4" style={{ background: 'transparent' }}>
        <div className="flex items-center gap-3 mb-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md border border-white/50"
          >
            <ArrowLeft className="w-5 h-5 text-[#091A7A]" />
          </motion.button>

          <div className="flex-1">
            <h1 className="text-[#091A7A]">{vocabularyName}</h1>
            <p className="text-xs text-[#091A7A]/60">
              {visibleWords.length} / {totalWords} words selected
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all ${
              undoStack.length > 0
                ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED]'
                : 'bg-gray-300'
            }`}
          >
            <Undo2 className="w-5 h-5 text-white" />
          </motion.button>
        </div>

        <div className="text-xs text-[#091A7A]/60 mb-2">
          Swipe left or right to remove words you already know
        </div>
      </div>

      {/* Word List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="p-4">
          <AnimatePresence>
            {visibleWords.map((word, index) => {
              const isRevealed = revealedMeanings.has(word.id);
              const isSwiping = swipingWord === word.id;
              const offset = isSwiping ? swipeOffset : 0;
              const opacity = Math.max(0.3, 1 - Math.abs(offset) / 200);

              return (
                <motion.div
                  key={word.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: opacity, 
                    y: 0,
                    x: offset,
                  }}
                  exit={{ opacity: 0, x: offset > 0 ? 300 : -300, height: 0 }}
                  transition={{ duration: 0.2 }}
                  onTouchStart={(e) => handleTouchStart(e, word.id)}
                  onTouchMove={(e) => handleTouchMove(e, word.id)}
                  onTouchEnd={() => handleTouchEnd(word.id)}
                  className="relative bg-white/95 backdrop-blur-lg rounded-[20px] p-4 mb-3 shadow-md border border-white/20"
                  style={{
                    touchAction: isSwiping ? 'none' : 'auto',
                  }}
                >
                  {/* Swipe indicator */}
                  {isSwiping && Math.abs(offset) > 50 && (
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 ${
                        offset > 0 ? 'right-4' : 'left-4'
                      }`}
                    >
                      <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center opacity-80">
                        <X className="w-6 h-6 text-white" strokeWidth={3} />
                      </div>
                    </div>
                  )}

                  {/* Index */}
                  <div className="absolute top-2 left-2 w-6 h-6 bg-[#8B5CF6] rounded-full flex items-center justify-center">
                    <span className="text-[10px] text-white">{index + 1}</span>
                  </div>

                  {/* Word and Pronunciation */}
                  <div className="flex items-center gap-2 mb-2 pl-8">
                    <span className="text-[#091A7A] opacity-30 select-none">
                      {word.word}
                    </span>
                    {word.pronunciation && (
                      <>
                        <span className="text-xs text-[#091A7A]/50">
                          {word.pronunciation}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => speakWord(word.word)}
                          className="w-6 h-6 bg-[#8B5CF6]/10 rounded-full flex items-center justify-center"
                        >
                          <Volume2 className="w-3 h-3 text-[#8B5CF6]" />
                        </motion.button>
                      </>
                    )}
                  </div>

                  {/* Meaning - Tap to reveal/hide */}
                  <div className="h-[1px] bg-[#091A7A]/10 mb-2" />
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleMeaning(word.id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    {isRevealed ? (
                      <>
                        <EyeOff className="w-4 h-4 text-[#8B5CF6]" />
                        <span className="text-sm text-[#091A7A]">{word.meaning}</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 text-[#8B5CF6]" />
                        <span className="text-sm text-[#091A7A]/30 select-none">
                          Tap to reveal meaning
                        </span>
                      </>
                    )}
                  </motion.div>

                  {/* Example Sentence */}
                  {word.example_sentence && isRevealed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 pt-2 border-t border-[#091A7A]/10"
                    >
                      <p className="text-xs text-[#091A7A]/60 italic">
                        "{word.example_sentence}"
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {visibleWords.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[#091A7A]/70">All words removed</p>
              <p className="text-sm text-[#091A7A]/50 mt-1">
                Use the undo button to restore words
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Panel */}
      <div className="sticky bottom-0 bg-white/80 backdrop-blur-lg border-t border-white/20 p-4">
        <div className="mb-3">
          <label className="block text-sm text-[#091A7A] mb-2">
            Words per unit: {wordsPerUnit}
          </label>
          <input
            type="range"
            min="10"
            max={Math.max(10, visibleWords.length)}
            step="10"
            value={wordsPerUnit}
            onChange={(e) => setWordsPerUnit(Number(e.target.value))}
            className="w-full h-2 bg-[#091A7A]/10 rounded-lg appearance-none cursor-pointer slider-thumb"
          />
          <div className="flex justify-between text-xs text-[#091A7A]/50 mt-1">
            <span>10</span>
            <span className="text-[#8B5CF6]">
              {totalUnits} unit{totalUnits !== 1 ? 's' : ''} will be created
            </span>
            <span>{Math.max(10, visibleWords.length)}</span>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleComplete}
          disabled={visibleWords.length === 0}
          className={`w-full h-12 rounded-[20px] flex items-center justify-center shadow-lg transition-all ${
            visibleWords.length > 0
              ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white'
              : 'bg-gray-300 text-gray-500'
          }`}
        >
          Add to My Vocabulary
        </motion.button>
      </div>
    </div>
  );
}

// Import these from utils
import { projectId, publicAnonKey } from '../utils/supabase/info';