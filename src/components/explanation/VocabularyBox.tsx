import { useState } from 'react';
import { Check, Plus, FolderPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VocabWord {
  word: string;
  pos: string;
  meaning: string;
  level: string;
}

interface VocabularyBoxProps {
  vocabulary: VocabWord[];
  onAddToVocabulary?: (words: VocabWord[]) => void;
  onCreateNewVocabulary?: (words: VocabWord[]) => void;
}

export function VocabularyBox({ vocabulary, onAddToVocabulary, onCreateNewVocabulary }: VocabularyBoxProps) {
  const [selectedWords, setSelectedWords] = useState<Set<number>>(new Set());
  const [showActions, setShowActions] = useState(false);

  const toggleWord = (index: number) => {
    const newSelected = new Set(selectedWords);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedWords(newSelected);
    setShowActions(newSelected.size > 0);
  };

  const selectAll = () => {
    const allIndices = new Set(vocabulary.map((_, i) => i));
    setSelectedWords(allIndices);
    setShowActions(true);
  };

  const deselectAll = () => {
    setSelectedWords(new Set());
    setShowActions(false);
  };

  const getSelectedWords = () => {
    return Array.from(selectedWords).map(i => vocabulary[i]);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case '상': return 'bg-red-100 text-red-700 border-red-200';
      case '중': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case '하': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (!vocabulary || vocabulary.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-purple-100 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#491B6D]">추출된 어휘</h3>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-xs text-purple-600 hover:text-purple-800"
          >
            전체 선택
          </button>
          <button
            onClick={deselectAll}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            선택 해제
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto">
        {vocabulary.map((word, index) => (
          <motion.div
            key={`${word.word}-${index}`}
            whileTap={{ scale: 0.98 }}
            onClick={() => toggleWord(index)}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedWords.has(index)
                ? 'bg-purple-50 border-purple-300 shadow-sm'
                : 'bg-gray-50 border-gray-200 hover:border-purple-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedWords.has(index)
                    ? 'bg-purple-600 border-purple-600'
                    : 'border-gray-300'
                }`}>
                  {selectedWords.has(index) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <div>
                  <span className="font-semibold text-[#491B6D]">{word.word}</span>
                  <span className="ml-2 text-xs text-gray-500">{word.pos}</span>
                </div>
              </div>
              <span className={`px-2 py-0.5 text-xs rounded-full border ${getLevelColor(word.level)}`}>
                {word.level}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600 ml-8">{word.meaning}</p>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex gap-2 pt-2 border-t border-gray-200"
          >
            <button
              onClick={() => onAddToVocabulary?.(getSelectedWords())}
              style={{ backgroundColor: '#7C3AED', color: '#FFFFFF' }}
              className="flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              기존 단어장에 추가 ({selectedWords.size})
            </button>
            <button
              onClick={() => onCreateNewVocabulary?.(getSelectedWords())}
              style={{ backgroundColor: '#7C3AED', color: '#FFFFFF' }}
              className="flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2"
            >
              <FolderPlus className="w-4 h-4" />
              새 단어장 만들기 ({selectedWords.size})
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
