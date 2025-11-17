import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Volume2,
  Star,
  ChevronDown,
  Eye,
  EyeOff,
  Layers,
  Skull,
  Trash2,
  Home
} from 'lucide-react';
import { BackButton } from './BackButton';

interface WordListScreenProps {
  onBack: () => void;
  onBackToHome?: () => void;
  vocabularyTitle: string;
  unitName: string;
  vocabularyWords?: any[]; // 실제 단어 데이터
  onAddToStarred?: (wordId: string) => void;
  onMoveToGraveyard?: (wordId: string) => void;
  onDeletePermanently?: (wordId: string) => void;
  onStartFlashcards?: () => void;
  filterType?: 'all' | 'starred' | 'graveyard' | 'wrong-answers'; // wrong-answers 추가
  starredWordIds?: string[]; // 별표된 단어 ID 목록
  graveyardWordIds?: string[]; // 무덤 단어 ID 목록
  wrongAnswersWordIds?: string[]; // 오답 단어 ID 목록
  hideHeader?: boolean; // 헤더 숨기기
  hideActionButtons?: boolean; // 액션 버튼 숨기기
}

interface WordData {
  id: string;
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  meaning: string;
  example: string; // 영어 예문
  translation: string; // 한글 번역
  story: string;
  derivatives: { word: string; meaning: string }[];
  synonyms: { word: string; meaning: string }[];
  antonyms: { word: string; meaning: string }[];
  isStarred: boolean;
  isMeaningRevealed: boolean;
  isExpanded: boolean;
  exampleLanguage: 'en' | 'kr'; // 개별 단어의 예문 언어 설정
  swipeX: number;
  originalIndex: number; // 원래 번호를 저장
}

export function WordListScreen({ onBack, onBackToHome, vocabularyTitle, unitName, vocabularyWords, onAddToStarred, onMoveToGraveyard, onDeletePermanently, onStartFlashcards, filterType, starredWordIds = [], graveyardWordIds = [], wrongAnswersWordIds = [], hideHeader = false, hideActionButtons = false }: WordListScreenProps) {
  console.log('[WordListScreen] 🎯 Received props:', { 
    vocabularyWords: vocabularyWords?.length || 0,
    hideActionButtons,
    hideHeader,
    filterType 
  });

  // Convert vocabularyWords to WordData format
  const convertToWordData = (rawWords: any[]): WordData[] => {
    console.log('[WordListScreen] 🔄 Converting words:', rawWords.length);
    return rawWords.map((word, index) => ({
      id: word.id || `word-${index}`,
      word: word.word || '',
      pronunciation: word.pronunciation || '',
      partOfSpeech: word.partOfSpeech || '',
      meaning: word.meaning || '',
      example: word.example_sentence || word.englishExample || word.example || '', // 서버 필드명 example_sentence 우선
      translation: word.translation || '', // 한글 번역
      story: word.etymology || word.story || '', // etymology 필드를 story로 매핑
      derivatives: Array.isArray(word.derivatives) 
        ? word.derivatives.map((d: any) => ({ word: d.word || d, meaning: d.meaning || '' }))
        : typeof word.derivatives === 'string' && word.derivatives
        ? word.derivatives.split(',').map(d => {
            const trimmed = d.trim();
            // "word (meaning)" 형식 파싱
            const match = trimmed.match(/^(.+?)\s*\((.+?)\)\s*$/);
            if (match) {
              return { word: match[1].trim(), meaning: match[2].trim() };
            }
            return { word: trimmed, meaning: '' };
          })
        : [],
      synonyms: Array.isArray(word.synonyms)
        ? word.synonyms.map((s: any) => ({ word: s.word || s, meaning: s.meaning || '' }))
        : typeof word.synonyms === 'string' && word.synonyms
        ? word.synonyms.split(',').map(s => ({ word: s.trim(), meaning: '' }))
        : [],
      antonyms: Array.isArray(word.antonyms)
        ? word.antonyms.map((a: any) => ({ word: a.word || a, meaning: a.meaning || '' }))
        : typeof word.antonyms === 'string' && word.antonyms
        ? word.antonyms.split(',').map(a => ({ word: a.trim(), meaning: '' }))
        : [],
      isStarred: false,
      isMeaningRevealed: true,
      isExpanded: false,
      exampleLanguage: 'en', // 기본값 EN
      swipeX: 0,
      originalIndex: index + 1
    }));
  };

  // Use vocabularyWords if provided, otherwise empty array
  const baseWords = vocabularyWords && vocabularyWords.length > 0 
    ? convertToWordData(vocabularyWords)
    : [];

  // 필터링된 단어 목록 생성
  const getFilteredWords = () => {
    let filtered = baseWords;

    if (filterType === 'starred') {
      // 서버에서 이미 별표된 단어만 반환하므로, 추가 필터링 불필요
      // 단, baseWords가 비어있으면 로컬 ID 기반으로 필터링 시도
      if (baseWords.length === 0 && starredWordIds.length > 0) {
        filtered = [];
      } else {
        filtered = baseWords;
      }
    } else if (filterType === 'graveyard') {
      // 서버에서 이미 무덤 단어만 반환
      if (baseWords.length === 0 && graveyardWordIds.length > 0) {
        filtered = [];
      } else {
        filtered = baseWords;
      }
    } else if (filterType === 'wrong-answers') {
      // 서버에서 이미 오답 단어만 반환
      if (baseWords.length === 0 && wrongAnswersWordIds.length > 0) {
        filtered = [];
      } else {
        filtered = baseWords;
      }
    } else {
      // 일반 단어장: 무덤 단어는 제외하고 별표 상태 반영
      filtered = baseWords.filter(w => !graveyardWordIds.includes(w.id));
    }
    
    // 별표 상태 업데이트
    return filtered.map((w, idx) => ({
      ...w,
      isStarred: starredWordIds.includes(w.id),
      isMeaningRevealed: false,
      originalIndex: filterType === 'starred' || filterType === 'graveyard' ? idx + 1 : w.originalIndex
    }));
  };

  const [words, setWords] = useState<WordData[]>(getFilteredWords());
  const [hideAllMeanings, setHideAllMeanings] = useState(true);
  const [exampleLanguage, setExampleLanguage] = useState<'en' | 'kr'>('en'); // EN/KR 토글 상태

  // Update words when vocabularyWords prop changes
  useEffect(() => {
    console.log('[WordListScreen] 🔄 vocabularyWords changed, updating words...');
    const newWords = getFilteredWords();
    console.log('[WordListScreen] ✅ New words count:', newWords.length);
    
    // 기존 단어의 상태를 보존하면서 업데이트
    setWords(prevWords => {
      return newWords.map(newWord => {
        // 기존 단어 찾기
        const existingWord = prevWords.find(w => w.id === newWord.id);
        
        // 기존 단어가 있으면 사용자 설정 보존
        if (existingWord) {
          return {
            ...newWord,
            isMeaningRevealed: existingWord.isMeaningRevealed,
            isExpanded: existingWord.isExpanded,
            exampleLanguage: existingWord.exampleLanguage,
            swipeX: 0 // swipe는 초기화
          };
        }
        
        // 새로운 단어는 그대로
        return newWord;
      });
    });
  }, [vocabularyWords, starredWordIds, graveyardWordIds, wrongAnswersWordIds, filterType]);

  const totalWords = words.length;
  const starredCount = words.filter(w => w.isStarred).length;

  // 예문에서 단어 하이라이트 함수
  const highlightWord = (text: string, targetWord: string) => {
    if (!text || !targetWord) return text;
    
    // 대소문자 무관하게 단어 찾기 (단어 경계 고려)
    const regex = new RegExp(`\\b(${targetWord})\\b`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (part.toLowerCase() === targetWord.toLowerCase()) {
        return (
          <span key={index} style={{ color: '#491B6D', fontWeight: 700 }}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const toggleWordStar = (id: string) => {
    setWords(words.map(w => {
      if (w.id === id) {
        const newStarred = !w.isStarred;
        if (onAddToStarred) {
          onAddToStarred(id);
        }
        return { ...w, isStarred: newStarred };
      }
      return w;
    }));
  };

  const toggleStar = (id: string) => {
    toggleWordStar(id);
  };

  const handleTTS = (text: string) => {
    if ('speechSynthesis' in window) {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();

      // Speak English 2 times
      for (let i = 0; i < 2; i++) {
        const utteranceEn = new SpeechSynthesisUtterance(text);
        utteranceEn.lang = 'en-US';
        utteranceEn.rate = 0.8;
        window.speechSynthesis.speak(utteranceEn);
      }

      // Speak Korean meaning 1 time
      const word = words.find(w => w.word === text);
      if (word) {
        const utteranceKo = new SpeechSynthesisUtterance(word.meaning);
        utteranceKo.lang = 'ko-KR';
        utteranceKo.rate = 0.9;
        window.speechSynthesis.speak(utteranceKo);
      }
    }
  };

  const handleSwipeToGraveyard = (id: string) => {
    if (onMoveToGraveyard) {
      onMoveToGraveyard(id);
    }
    setWords(words.filter(w => w.id !== id));
  };

  const handleDeletePermanently = (id: string) => {
    if (onDeletePermanently) {
      onDeletePermanently(id);
    }
    setWords(words.filter(w => w.id !== id));
  };

  const toggleWordExpansion = (id: string) => {
    setWords(words.map(w => 
      w.id === id ? { ...w, isExpanded: !w.isExpanded } : w
    ));
  };

  const toggleMeaningReveal = (id: string) => {
    setWords(words.map(w => 
      w.id === id ? { ...w, isMeaningRevealed: !w.isMeaningRevealed } : w
    ));
  };

  const toggleHideAllMeanings = () => {
    const newHideAll = !hideAllMeanings;
    setHideAllMeanings(newHideAll);
    setWords(words.map(w => ({ ...w, isMeaningRevealed: !newHideAll })));
  };

  const revealAllMeanings = () => {
    setHideAllMeanings(false);
    setWords(words.map(w => ({ ...w, isMeaningRevealed: true })));
  };

  const expandAll = () => {
    setWords(words.map(w => ({ ...w, isExpanded: true })));
  };

  const collapseAll = () => {
    setWords(words.map(w => ({ ...w, isExpanded: false })));
  };

  // 개별 단어의 예문 언어 토글
  const toggleWordExampleLanguage = (id: string) => {
    setWords(words.map(w => 
      w.id === id ? { ...w, exampleLanguage: w.exampleLanguage === 'en' ? 'kr' : 'en' } : w
    ));
  };

  // 모든 단어의 예문 언어 일괄 변경
  const toggleAllExampleLanguage = () => {
    const newLanguage = exampleLanguage === 'en' ? 'kr' : 'en';
    setExampleLanguage(newLanguage);
    setWords(words.map(w => ({ ...w, exampleLanguage: newLanguage })));
  };

  // Theme configurations based on filterType
  const getTheme = () => {
    switch (filterType) {
      case 'starred':
        return {
          bgGradient: 'from-[#FFFEF5] via-[#FFFEF8] to-[#FFFFF9]',
          headerBg: 'from-[#FFFBEB]/80 to-[#FEF3C7]/70',
          cardBg: 'linear-gradient(135deg, rgba(255, 251, 235, 0.7) 0%, rgba(254, 249, 230, 0.65) 100%)',
          cardBorder: 'border-amber-100/30',
          numberBadgeBg: 'from-[#FCD34D] to-[#F59E0B]',
          accentColor: '#F59E0B',
          textColor: '#78350F',
          buttonBg: '#F59E0B',
          buttonText: 'text-white',
          headerTextColor: '#78350F',
          secondaryTextColor: '#D97706',
          cardTextColor: '#78350F',
          iconColor: '#F59E0B',
          badgeColor: '#F59E0B',
          name: '⭐ Starred Words'
        };
      case 'graveyard':
        return {
          bgGradient: 'from-[#FCFCFC] via-[#FAFAFA] to-[#F9F9F9]',
          headerBg: 'from-[#F9FAFB]/80 to-[#F3F4F6]/70',
          cardBg: 'linear-gradient(135deg, rgba(249, 250, 251, 0.7) 0%, rgba(243, 244, 246, 0.65) 100%)',
          cardBorder: 'border-gray-200/30',
          numberBadgeBg: 'from-[#6B7280] to-[#4B5563]',
          accentColor: '#6B7280',
          textColor: '#374151',
          buttonBg: '#6B7280',
          buttonText: 'text-white',
          headerTextColor: '#374151',
          secondaryTextColor: '#6B7280',
          cardTextColor: '#374151',
          iconColor: '#6B7280',
          badgeColor: '#6B7280',
          name: '💀 Graveyard'
        };
      case 'wrong-answers':
        return {
          bgGradient: 'from-[#FFFAFA] via-[#FFFCFC] to-[#FFF9F9]',
          headerBg: 'from-[#FEF2F2]/80 to-[#FEE2E2]/70',
          cardBg: 'linear-gradient(135deg, rgba(254, 242, 242, 0.7) 0%, rgba(254, 226, 226, 0.65) 100%)',
          cardBorder: 'border-red-100/30',
          numberBadgeBg: 'from-[#EF4444] to-[#DC2626]',
          accentColor: '#DC2626',
          textColor: '#7F1D1D',
          buttonBg: '#DC2626',
          buttonText: 'text-white',
          headerTextColor: '#7F1D1D',
          secondaryTextColor: '#DC2626',
          cardTextColor: '#7F1D1D',
          iconColor: '#DC2626',
          badgeColor: '#DC2626',
          name: '❌ Wrong Answers'
        };
      default:
        return {
          bgGradient: 'from-[#F5F3FF] via-[#EDE9FE] to-[#E9E5FF]',
          headerBg: 'from-[#F5F3FF]/80 to-[#EDE9FE]/70',
          cardBg: 'rgba(255, 255, 255, 0.7)',
          cardBorder: 'border-purple-100/30',
          numberBadgeBg: 'from-[#C4B5FD] to-[#A78BFA]',
          accentColor: '#8B5CF6',
          textColor: '#491B6D',
          buttonBg: '#491B6D',
          buttonText: 'text-white',
          name: vocabularyTitle
        };
    }
  };

  const theme = getTheme();

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Header */}
      {!hideHeader && (
      <div className="sticky top-0 z-40 backdrop-blur-lg border-b border-white/20" style={{ background: 'transparent' }}>
        <div className="flex items-center justify-between p-6">
          <BackButton onClick={onBack} />

          <div className="flex-1 mx-4 text-center">
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: theme.headerTextColor || '#5B21B6' }}>
              {theme.name}
            </h1>
            <p style={{ fontSize: '12px', fontWeight: 500, color: theme.secondaryTextColor || '#A78BFA' }}>
              {unitName} · {totalWords}개의 단어
            </p>
          </div>

          {/* Home Button */}
          {onBackToHome && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onBackToHome}
              className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md"
            >
              <Home className="w-5 h-5" style={{ color: theme.headerTextColor || '#5B21B6' }} />
            </motion.button>
          )}
          {!onBackToHome && <div className="w-10" />}
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide m-[0px] p-[3px]">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleHideAllMeanings}
              className="px-3 py-2 bg-white/90 backdrop-blur-lg rounded-xl border border-white/40 shadow-sm flex items-center gap-1.5 whitespace-nowrap"
            >
              {hideAllMeanings ? (
                <Eye className="w-3.5 h-3.5" style={{ color: theme.iconColor || '#8B5CF6' }} />
              ) : (
                <EyeOff className="w-3.5 h-3.5" style={{ color: theme.iconColor || '#8B5CF6' }} />
              )}
              <span style={{ fontSize: '12px', fontWeight: 600, color: theme.cardTextColor || '#091A7A' }}>
                {hideAllMeanings ? '모두 보기' : '모두 가리기'}
              </span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={words.every(w => w.isExpanded) ? collapseAll : expandAll}
              className="px-3 py-2 bg-white/90 backdrop-blur-lg rounded-xl border border-white/40 shadow-sm flex items-center gap-1.5 whitespace-nowrap"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${words.every(w => w.isExpanded) ? 'rotate-180' : ''}`} style={{ color: theme.iconColor || '#8B5CF6' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: theme.cardTextColor || '#091A7A' }}>
                {words.every(w => w.isExpanded) ? '모두 접기' : '모두 펼치기'}
              </span>
            </motion.button>

            {/* EN/KR Toggle */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleAllExampleLanguage}
              className="px-3 py-2 bg-white/90 backdrop-blur-lg rounded-xl border border-white/40 shadow-sm flex items-center gap-1 whitespace-nowrap"
            >
              <span 
                style={{ 
                  fontSize: '11px', 
                  fontWeight: 700,
                  color: exampleLanguage === 'en' ? '#491B6D' : '#9CA3AF'
                }}
              >
                EN
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF' }}>|</span>
              <span 
                style={{ 
                  fontSize: '11px', 
                  fontWeight: 700,
                  color: exampleLanguage === 'kr' ? '#491B6D' : '#9CA3AF'
                }}
              >
                KR
              </span>
            </motion.button>

          </div>
        </div>
      </div>
      )}

      {/* Action Buttons - Only show when header is hidden */}
      {hideHeader && (
        <div className="sticky top-0 z-40 backdrop-blur-lg border-b border-white/20 bg-white/40 px-4 py-3 bg-[rgba(255,255,255,0)] px-[10px] py-[6px]">
          <div className="flex items-center justify-center gap-2 overflow-x-auto scrollbar-hide m-[0px] p-[3px]">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleHideAllMeanings}
              className="px-3 py-2 bg-white/90 backdrop-blur-lg rounded-xl border border-white/40 shadow-sm flex items-center gap-1.5 whitespace-nowrap"
            >
              {hideAllMeanings ? (
                <Eye className="w-3.5 h-3.5" style={{ color: theme.iconColor || '#8B5CF6' }} />
              ) : (
                <EyeOff className="w-3.5 h-3.5" style={{ color: theme.iconColor || '#8B5CF6' }} />
              )}
              <span style={{ fontSize: '12px', fontWeight: 600, color: theme.cardTextColor || '#091A7A' }}>
                {hideAllMeanings ? '모두 보기' : '모두 가리기'}
              </span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={words.every(w => w.isExpanded) ? collapseAll : expandAll}
              className="px-3 py-2 bg-white/90 backdrop-blur-lg rounded-xl border border-white/40 shadow-sm flex items-center gap-1.5 whitespace-nowrap"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${words.every(w => w.isExpanded) ? 'rotate-180' : ''}`} style={{ color: theme.iconColor || '#8B5CF6' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: theme.cardTextColor || '#091A7A' }}>
                {words.every(w => w.isExpanded) ? '모두 접기' : '모두 펼치기'}
              </span>
            </motion.button>

            {/* EN/KR Toggle */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleAllExampleLanguage}
              className="px-3 py-2 bg-white/90 backdrop-blur-lg rounded-xl border border-white/40 shadow-sm flex items-center gap-1 whitespace-nowrap"
            >
              <span 
                style={{ 
                  fontSize: '11px', 
                  fontWeight: 700,
                  color: exampleLanguage === 'en' ? '#491B6D' : '#9CA3AF'
                }}
              >
                EN
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF' }}>|</span>
              <span 
                style={{ 
                  fontSize: '11px', 
                  fontWeight: 700,
                  color: exampleLanguage === 'kr' ? '#491B6D' : '#9CA3AF'
                }}
              >
                KR
              </span>
            </motion.button>

          </div>
        </div>
      )}

      {/* Word Cards */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-8">
        <div className="space-y-3 pt-4">
          <AnimatePresence mode="popLayout">
            {words.map((word, index) => (
              <motion.div 
                key={word.id} 
                className="relative"
                layout
                exit={{ 
                  opacity: 0, 
                  x: -200, 
                  transition: { duration: 0.2, ease: 'easeOut' }
                }}
              >
                {/* Swipe Background - Different per theme */}
                {filterType !== 'graveyard' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-[#6B7280] to-[#4B5563] rounded-2xl flex items-center justify-end px-6">
                    <div className="flex items-center gap-2">
                      <Skull className="w-4 h-4 text-white/80" />
                      <div className="text-white" style={{ fontSize: '12px', fontWeight: 600 }}>
                        무덤으로 이동
                      </div>
                    </div>
                  </div>
                )}                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, x: word.swipeX }}
                  transition={{ delay: index * 0.05 }}
                  drag={filterType !== 'graveyard' ? "x" : false}
                  dragConstraints={{ left: -150, right: 0 }}
                  dragElastic={0}
                  onDragEnd={(e, info) => {
                    if (filterType !== 'graveyard' && info.offset.x < -100) {
                      handleSwipeToGraveyard(word.id);
                    } else {
                      setWords(words.map(w => 
                        w.id === word.id ? { ...w, swipeX: 0 } : w
                      ));
                    }
                  }}
                  onDrag={(e, info) => {
                    if (filterType !== 'graveyard') {
                      setWords(words.map(w => 
                        w.id === word.id ? { ...w, swipeX: Math.min(0, info.offset.x) } : w
                      ));
                    }
                  }}
                  className={`backdrop-blur-xl rounded-2xl overflow-hidden border ${theme.cardBorder} relative z-10`}
                  style={{
                    background: filterType === 'graveyard' 
                      ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.95) 0%, rgba(75, 85, 99, 0.9) 100%)'
                      : filterType === 'starred'
                      ? 'linear-gradient(135deg, rgba(254, 249, 195, 0.95) 0%, rgba(254, 243, 199, 0.9) 100%)'
                      : filterType === 'wrong-answers'
                      ? 'linear-gradient(135deg, rgba(254, 226, 226, 0.95) 0%, rgba(254, 202, 202, 0.9) 100%)'
                      : 'rgba(255, 255, 255, 0.95)',
                    boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.08)'
                  }}
                >
                  {/* GRAVEYARD - Simple word + meaning only */}
                  {filterType === 'graveyard' ? (
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#D1D5DB' }}>
                              {word.word}
                            </h3>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#9CA3AF' }}>
                              {word.pronunciation}
                            </span>
                          </div>
                          <p style={{ fontSize: '14px', fontWeight: 500, color: '#A1A1AA', lineHeight: 1.4 }}>
                            {word.meaning}
                          </p>
                        </div>
                        
                        {/* Tombstone Delete Button */}
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDeletePermanently(word.id)}
                          className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600 flex items-center justify-center shadow-lg"
                        >
                          <Skull className="w-5 h-5 text-gray-400" />
                        </motion.button>
                      </div>
                    </div>
                  ) : (
                    /* NORMAL / STARRED / WRONG-ANSWERS - Full card */
                    <>
                      {/* Card Header - Always Visible */}
                      <div 
                        className="cursor-pointer px-[12px] py-[16px] p-[12px]"
                        onClick={() => toggleWordExpansion(word.id)}
                      >
                        <div className="space-y-2">
                          {/* 첫 번째 줄: 번호 + 단어 + 발음 + 품사 + TTS + 별 */}
                          <div className="flex items-center gap-2.5">
                            {/* Number Badge - 더 작게 */}
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" 
                              style={{ backgroundColor: '#491B6D' }}
                            >
                              <span className="text-white" style={{ fontSize: '11px', fontWeight: 700 }}>
                                {word.originalIndex}
                              </span>
                            </div>

                            {/* 단어 + 발음 + 품사 + TTS */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <h3 className="text-gray-900" style={{ fontSize: '16px', fontWeight: 600 }}>
                                {word.word}
                              </h3>
                              <span className="text-gray-500" style={{ fontSize: '12px', fontWeight: 500 }}>
                                {word.pronunciation}
                              </span>
                              <span 
                                className="px-1.5 py-0.5 rounded" 
                                style={{ 
                                  fontSize: '10px', 
                                  fontWeight: 600,
                                  color: '#491B6D',
                                  backgroundColor: 'rgba(73, 27, 109, 0.08)',
                                  border: '1px solid rgba(73, 27, 109, 0.15)'
                                }}
                              >
                                {word.partOfSpeech}
                              </span>
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTTS(word.word);
                                }}
                                className="flex-shrink-0"
                              >
                                <Volume2 
                                  className="w-4 h-4" 
                                  style={{ color: '#491B6D', opacity: 0.6 }} 
                                />
                              </motion.button>
                            </div>

                            {/* Star Button */}
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStar(word.id);
                              }}
                              className="flex-shrink-0 p-1"
                            >
                              <Star 
                                className="w-4 h-4" 
                                style={{ 
                                  color: word.isStarred ? '#F59E0B' : '#491B6D',
                                  fill: word.isStarred ? '#F59E0B' : 'transparent',
                                  opacity: word.isStarred ? 1 : 0.3
                                }} 
                              />
                            </motion.button>
                          </div>

                          {/* 두 번째 줄: 눈 아이콘 + 뜻 + 토글 */}
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 flex-shrink-0" /> {/* 번호 자리 빈 공간 */}
                            
                            <div 
                              className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMeaningReveal(word.id);
                              }}
                            >
                              <Eye className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#9CA3AF' }} />
                              <p 
                                className="text-gray-600 transition-all duration-200"
                                style={{ 
                                  fontSize: '13px', 
                                  fontWeight: 500,
                                  color: '#6B7280',
                                  lineHeight: 1.4,
                                  filter: word.isMeaningRevealed ? 'blur(0px)' : 'blur(4px)',
                                  userSelect: word.isMeaningRevealed ? 'auto' : 'none'
                                }}
                              >
                                {word.meaning}
                              </p>
                            </div>

                            {/* Expand/Collapse Toggle */}
                            <motion.div
                              animate={{ rotate: word.isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex-shrink-0 p-1"
                            >
                              <ChevronDown className="w-4 h-4" style={{ color: '#491B6D', opacity: 0.3 }} />
                            </motion.div>
                          </div>

                          {/* 세 번째 줄: 영어 예문 (항상 표시) */}
                          {(word.example || word.translation) && (
                            <div className="flex gap-2.5">
                              {/* EN/KR Toggle 버튼 */}
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleWordExampleLanguage(word.id);
                                }}
                                className="w-6 h-6 flex-shrink-0 rounded-md bg-white/90 border border-[#E5E7EB]/60 flex items-center justify-center shadow-sm"
                              >
                                <span 
                                  style={{ 
                                    fontSize: '8px', 
                                    fontWeight: 700,
                                    color: word.exampleLanguage === 'en' ? '#491B6D' : '#9CA3AF'
                                  }}
                                >
                                  {word.exampleLanguage === 'en' ? 'EN' : 'KR'}
                                </span>
                              </motion.button>
                              
                              <div className="flex-1 bg-[#F3F4F6]/60 border border-[#E5E7EB]/40 rounded-lg px-3 py-2">
                                <p className="text-[#4B5563]" style={{ fontSize: '12px', fontWeight: 500, lineHeight: 1.5 }}>
                                  {word.exampleLanguage === 'en' 
                                    ? highlightWord(word.example, word.word)
                                    : highlightWord(word.translation, word.word)
                                  }
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {word.isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-3 pt-2">
                              {/* Story - 어원 이야기 */}
                              {word.story && (
                                <div className="bg-[#F3F4F6]/80 border border-[#E5E7EB]/60 rounded-[16px] p-[10px]">
                                  <div className="flex items-start gap-2 mb-1.5">
                                    <div className="w-1 h-1 rounded-full bg-[#8B5CF6] mt-2" />
                                    <span className="text-[#6B7280]" style={{ fontSize: '11px', fontWeight: 700 }}>어원 이야기</span>
                                  </div>
                                  <p className="text-[#4B5563] pl-3" style={{ fontSize: '11px', fontWeight: 500, lineHeight: 1.6 }}>
                                    {word.story}
                                  </p>
                                </div>
                              )}

                              {/* Related Words */}
                              <div className="space-y-2">
                                {/* Derivatives */}
                                {word.derivatives.length > 0 && (
                                  <div className="bg-white/60 rounded-[16px] p-2.5 border border-[#E5E7EB]/50">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <div className="w-1 h-1 rounded-full bg-[#8B5CF6]" />
                                      <span className="text-[#6B7280]" style={{ fontSize: '11px', fontWeight: 700 }}>파생어</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pl-3 text-[14px]">
                                      {word.derivatives.map((der, idx) => (
                                        <span key={idx} className="inline-flex items-center gap-1.5">
                                          <span className="text-[#091A7A]" style={{ fontSize: '11px', fontWeight: 600 }}>{der.word}</span>
                                          {der.meaning && (
                                            <span className="text-[#9CA3AF]" style={{ fontSize: '9px', fontWeight: 500 }}>({der.meaning})</span>
                                          )}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Synonyms and Antonyms in 2-column grid */}
                                {(word.synonyms.length > 0 || word.antonyms.length > 0) && (
                                  <div className="grid grid-cols-2 gap-2">
                                    {/* Synonyms */}
                                    {word.synonyms.length > 0 && (
                                      <div className="bg-white/60 rounded-[16px] p-2.5 border border-[#E5E7EB]/50">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                          <div className="w-1 h-1 rounded-full bg-[#8B5CF6]" />
                                          <span className="text-[#6B7280]" style={{ fontSize: '11px', fontWeight: 700 }}>유의어</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pl-3 text-[14px]">
                                          {word.synonyms.map((syn, idx) => (
                                            <span key={idx} className="text-[#091A7A]" style={{ fontSize: '11px', fontWeight: 600 }}>
                                              {syn.word}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Antonyms */}
                                    {word.antonyms.length > 0 && (
                                      <div className="bg-white/60 rounded-[16px] p-2.5 border border-[#E5E7EB]/50">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                          <div className="w-1 h-1 rounded-full bg-[#8B5CF6]" />
                                          <span className="text-[#6B7280]" style={{ fontSize: '11px', fontWeight: 700 }}>반의어</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pl-3">
                                          {word.antonyms.map((ant, idx) => (
                                            <span key={idx} className="text-[#091A7A]" style={{ fontSize: '11px', fontWeight: 600 }}>
                                              {ant.word}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
