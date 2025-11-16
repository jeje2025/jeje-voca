import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { Volume2, Star, Skull, Play, Pause, Square, Shuffle } from 'lucide-react';
import { BackButton } from './BackButton';
import { HomeButton } from './HomeButton';

interface Flashcard {
  id: string;
  word: string;
  pronunciation: string;
  meaning: string;
  example: string;
  etymology?: string;
  synonyms?: string[];
  antonyms?: string[];
}

interface FlashcardScreenProps {
  onBack: () => void;
  onBackToHome?: () => void;
  vocabularyWords?: any[]; // 실제 단어 데이터
  onAddToStarred?: (wordId: string) => void;
  onMoveToGraveyard?: (wordId: string) => void;
  starredWordIds?: string[];
  graveyardWordIds?: string[];
}

const sampleCards: Flashcard[] = [
  {
    id: '1',
    word: 'Ephemeral',
    pronunciation: '/ɪˈfem.ər.əl/',
    meaning: '일시적인, 덧없는',
    example: 'The beauty of cherry blossoms is ephemeral, lasting only a few weeks.',
    etymology: 'Greek ephemeros (lasting only a day)',
    synonyms: ['temporary', 'fleeting', 'transient'],
    antonyms: ['permanent', 'eternal', 'lasting']
  },
  {
    id: '2',
    word: 'Serendipity',
    pronunciation: '/ˌser.ənˈdɪp.ə.ti/',
    meaning: '뜻밖의 행운, 우연한 발견',
    example: 'It was pure serendipity that we met at the cafe.',
    etymology: 'Coined by Horace Walpole from Persian fairy tale',
    synonyms: ['chance', 'fortune', 'luck'],
    antonyms: ['misfortune', 'bad luck']
  },
  {
    id: '3',
    word: 'Ubiquitous',
    pronunciation: '/juːˈbɪk.wɪ.təs/',
    meaning: '어디에나 있는, 편재하는',
    example: 'Smartphones have become ubiquitous in modern society.',
    etymology: 'Latin ubique (everywhere)',
    synonyms: ['omnipresent', 'pervasive', 'universal'],
    antonyms: ['rare', 'scarce', 'uncommon']
  }
];

export function FlashcardScreen({ onBack, onBackToHome, vocabularyWords, onAddToStarred, onMoveToGraveyard, starredWordIds = [], graveyardWordIds = [] }: FlashcardScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Convert vocabularyWords to Flashcard format
  const convertedCards = vocabularyWords && vocabularyWords.length > 0
    ? vocabularyWords.map((word: any) => ({
        id: word.id || '',
        word: word.word || '',
        pronunciation: word.pronunciation || '',
        meaning: word.meaning || '',
        example: word.example_sentence || word.example || '',
        etymology: word.etymology || '',
        synonyms: Array.isArray(word.synonyms) 
          ? word.synonyms.map((s: any) => typeof s === 'string' ? s : s.word)
          : typeof word.synonyms === 'string' && word.synonyms
          ? word.synonyms.split(',').map((s: string) => s.trim())
          : [],
        antonyms: Array.isArray(word.antonyms)
          ? word.antonyms.map((a: any) => typeof a === 'string' ? a : a.word)
          : typeof word.antonyms === 'string' && word.antonyms
          ? word.antonyms.split(',').map((a: string) => a.trim())
          : []
      }))
    : sampleCards;

  const [cards, setCards] = useState<Flashcard[]>(convertedCards);

  // Update cards when vocabularyWords changes
  useEffect(() => {
    if (vocabularyWords && vocabularyWords.length > 0) {
      const newCards = vocabularyWords.map((word: any) => ({
        id: word.id || '',
        word: word.word || '',
        pronunciation: word.pronunciation || '',
        meaning: word.meaning || '',
        example: word.example_sentence || word.example || '',
        etymology: word.etymology || '',
        synonyms: Array.isArray(word.synonyms) 
          ? word.synonyms.map((s: any) => typeof s === 'string' ? s : s.word)
          : typeof word.synonyms === 'string' && word.synonyms
          ? word.synonyms.split(',').map((s: string) => s.trim())
          : [],
        antonyms: Array.isArray(word.antonyms)
          ? word.antonyms.map((a: any) => typeof a === 'string' ? a : a.word)
          : typeof word.antonyms === 'string' && word.antonyms
          ? word.antonyms.split(',').map((a: string) => a.trim())
          : []
      }));
      setCards(newCards);
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  }, [vocabularyWords]);

  const currentCard = cards[currentIndex];
  const isStarred = starredWordIds.includes(currentCard?.id || '');
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef(false);

  // 상하 스크롤 완전 차단
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    const originalOverflowY = window.getComputedStyle(document.body).overflowY;
    document.body.style.overflow = 'hidden';
    document.body.style.overflowY = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overflowY = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
      document.body.style.overflowY = originalOverflowY;
      document.documentElement.style.overflow = '';
      document.documentElement.style.overflowY = '';
    };
  }, []);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 50; // 모바일에서 더 쉽게 스와이프할 수 있도록 임계값 낮춤
    const velocity = info.velocity.x;
    const offset = info.offset.x;
    
    // 속도 기반 스와이프 감지 (빠른 스와이프도 인식)
    const isFastSwipe = Math.abs(velocity) > 300;
    const isSwipeRight = offset > threshold || (isFastSwipe && velocity > 0);
    const isSwipeLeft = offset < -threshold || (isFastSwipe && velocity < 0);
    
    if (isSwipeRight) {
      // Swipe right - previous card
      if (currentIndex > 0) {
        setDirection(-1);
        setCurrentIndex(currentIndex - 1);
        setIsFlipped(false);
      }
    } else if (isSwipeLeft) {
      // Swipe left - next card
      if (currentIndex < cards.length - 1) {
        setDirection(1);
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
      }
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // TTS 재생 함수
  const speakText = (text: string, lang: string = 'en-US'): Promise<void> => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis not supported');
        resolve();
        return;
      }

      // 기존 재생 중지
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = lang === 'ko-KR' ? 0.9 : 0.8;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onend = () => {
        isSpeakingRef.current = false;
        resolve();
      };

      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        isSpeakingRef.current = false;
        resolve();
      };

      isSpeakingRef.current = true;
      window.speechSynthesis.speak(utterance);
    });
  };

  // 자동 재생 모드일 때 카드 재생
  useEffect(() => {
    if (!isAutoPlaying) {
      // 자동 재생 중지 시 TTS도 중지
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
      return;
    }

    // 이전 타이머 정리
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
    }

    // 현재 카드 정보 가져오기
    const card = cards[currentIndex];
    if (!card) return;

    // 현재 카드 자동 재생 함수 (영어 2번, 한글 1번)
    const playCurrentCard = async () => {
      // 자동 재생이 중지되었는지 확인
      if (!isAutoPlaying) return;

      // 영어 단어 2번 재생
      await speakText(card.word, 'en-US');
      await new Promise(resolve => setTimeout(resolve, 300)); // 간격

      if (!isAutoPlaying) return; // 중지 확인

      await speakText(card.word, 'en-US');
      await new Promise(resolve => setTimeout(resolve, 500)); // 간격

      if (!isAutoPlaying) return; // 중지 확인

      // 한글 재생 전에 카드 뒤집기
      setIsFlipped(true);
      await new Promise(resolve => setTimeout(resolve, 600)); // 뒤집기 애니메이션 대기

      if (!isAutoPlaying) return; // 중지 확인

      // 한글 뜻 1번 재생
      await speakText(card.meaning, 'ko-KR');
      await new Promise(resolve => setTimeout(resolve, 800)); // 다음 카드로 넘어가기 전 대기

      // 다음 카드로 이동
      if (isAutoPlaying) {
        if (currentIndex < cards.length - 1) {
          setDirection(1);
          setCurrentIndex(currentIndex + 1);
          setIsFlipped(false);
        } else {
          // 마지막 카드면 처음으로 돌아가거나 정지
          setIsAutoPlaying(false);
        }
      }
    };

    // 약간의 지연 후 재생 시작 (애니메이션 완료 대기)
    autoPlayTimeoutRef.current = setTimeout(() => {
      playCurrentCard();
    }, 500);

    return () => {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
    };
  }, [isAutoPlaying, currentIndex, cards]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
    };
  }, []);

  const handlePronunciation = () => {
    speakText(currentCard.word, 'en-US');
  };

  const handleAutoPlay = () => {
    setIsAutoPlaying(true);
  };

  const handlePause = () => {
    setIsAutoPlaying(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const handleStop = () => {
    setIsAutoPlaying(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleAddToStarred = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToStarred) {
      onAddToStarred(currentCard.id);
    }
  };

  const handleMoveToGraveyard = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExiting(true);

    // Move to graveyard
    if (onMoveToGraveyard) {
      onMoveToGraveyard(currentCard.id);
    }

    // Wait for fade out animation then move to next card
    setTimeout(() => {
      if (currentIndex < cards.length - 1) {
        setDirection(1);
        setCurrentIndex(currentIndex + 1);
      } else if (currentIndex > 0) {
        setDirection(-1);
        setCurrentIndex(currentIndex - 1);
      }
      setIsExiting(false);
      setIsFlipped(false);
    }, 300);
  };

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  return (
    <div
      className="min-h-screen h-screen flex flex-col bg-gradient-to-b from-[#D4C5FF] to-[#E5D9FF] fixed inset-0"
      style={{
        overflow: 'hidden',
        overflowY: 'hidden',
        maxWidth: '100vw',
        width: '100vw',
        height: '100dvh',
        touchAction: 'pan-x',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-lg" style={{ background: 'transparent' }}>
        <div className="flex items-center justify-between p-4">
          <BackButton onClick={onBack} />

          <div className="flex flex-col items-center">
            <h1 className="text-[#091A7A]" style={{ fontSize: '18px', fontWeight: 600 }}>
              플래시카드
            </h1>
            <p className="text-[#6B7280]" style={{ fontSize: '12px', fontWeight: 500 }}>
              {currentIndex + 1} / {cards.length}
            </p>
          </div>

          {/* Home Button */}
          {onBackToHome ? <HomeButton onClick={onBackToHome} /> : <div className="w-12 h-12" />}
        </div>
      </div>

      {/* Flashcard Container */}
      <div className="flex-1 flex justify-center items-start pt-2" style={{ overflow: 'visible', maxWidth: '100vw', touchAction: 'auto' }}>
        <div className="w-full max-w-[380px] h-full max-h-[70vh] relative flex items-center justify-center" style={{ overflow: 'visible', touchAction: 'auto' }}>
          {/* Previous Card (Left) */}
          {currentIndex > 0 && (
            <motion.div 
              className="absolute left-0 pointer-events-none z-0"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 0.4, x: 0 }}
              transition={{ duration: 0.3 }}
              style={{ 
                width: '70%',
                height: '85%',
                transform: 'translateX(-75%) scale(0.7)',
                transformOrigin: 'right center'
              }}
            >
              <div 
                className="w-full h-full bg-white/90 backdrop-blur-lg shadow-2xl rounded-[20px] border-2 border-white/30"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)'
                }}
              />
            </motion.div>
          )}

          {/* Next Card (Right) */}
          {currentIndex < cards.length - 1 && (
            <motion.div 
              className="absolute right-0 pointer-events-none z-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 0.4, x: 0 }}
              transition={{ duration: 0.3 }}
              style={{ 
                width: '70%',
                height: '85%',
                transform: 'translateX(75%) scale(0.7)',
                transformOrigin: 'left center'
              }}
            >
              <div 
                className="w-full h-full bg-white/90 backdrop-blur-lg shadow-2xl rounded-[20px] border-2 border-white/30"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)'
                }}
              />
            </motion.div>
          )}

          {/* Main Card Container */}
          <div className="w-[92%] h-full relative z-10 mx-auto" style={{ overflow: 'visible', touchAction: 'pan-x' }}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={currentIndex}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{
                  scale: isExiting ? 0.8 : 1,
                  opacity: isExiting ? 0 : 1
                }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: isExiting ? 0.3 : 0.2 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.3}
                dragMomentum={false}
                dragPropagation={false}
                whileDrag={{ cursor: 'grabbing' }}
                onDragStart={() => {
                  setIsDragging(true);
                }}
                onDragEnd={(e, info) => {
                  setIsDragging(false);
                  handleDragEnd(e, info);
                }}
                className="absolute inset-0 cursor-grab active:cursor-grabbing"
                style={{
                  perspective: '1000px',
                  zIndex: 10
                }}
              >
              <motion.div
                className="w-full h-full relative"
                style={{ transformStyle: 'preserve-3d', pointerEvents: isDragging ? 'none' : 'auto' }}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: 'spring' }}
                onClick={(e) => {
                  if (!isDragging) {
                    handleFlip();
                  }
                }}
              >
                {/* Front Side */}
                <div
                  className="absolute inset-0 bg-white/95 backdrop-blur-lg px-8 py-4 flex flex-col items-center justify-center rounded-[20px] border border-white/20 shadow-2xl"
                  style={{
                    backfaceVisibility: 'hidden'
                  }}
                >
                  {/* Star Button - Top Right */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleAddToStarred}
                    className="absolute top-5 right-5"
                  >
                    <motion.div
                      animate={isStarred ? {
                        scale: [1, 1.3, 1],
                        rotate: [0, -15, 15, 0],
                      } : {}}
                      transition={{ 
                        duration: 0.5,
                        ease: "easeOut"
                      }}
                    >
                      <Star className={`w-7 h-7 ${isStarred ? 'fill-[#FCD34D] text-[#FCD34D] drop-shadow-[0_0_8px_rgba(252,211,77,0.6)]' : 'text-[#D1D5DB]'}`} />
                    </motion.div>
                  </motion.button>

                  {/* Skull Button - Bottom Right */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleMoveToGraveyard}
                    className="absolute bottom-5 right-5"
                  >
                    <Skull className="w-7 h-7 text-[#6B7280]" />
                  </motion.button>

                  <div className="flex flex-col items-center gap-6 w-full">
                    <div className="w-20 h-1 bg-[#491B6D]/20" style={{ borderRadius: 'var(--radius-pill)' }} />
                    
                    <h2 className="text-[#091A7A] text-center px-4" style={{ fontSize: '48px', fontWeight: 700, lineHeight: 1.2 }}>
                      {currentCard.word}
                    </h2>

                    <div className="flex items-center gap-3">
                      <p className="text-[#6B7280]" style={{ fontSize: '16px', fontWeight: 400 }}>
                        {currentCard.pronunciation}
                      </p>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePronunciation();
                        }}
                        className="w-10 h-10 bg-[#491B6D]/10 rounded-full flex items-center justify-center"
                      >
                        <Volume2 className="w-5 h-5 text-[#491B6D]" />
                      </motion.button>
                    </div>

                    <div className="w-20 h-1 bg-[#491B6D]/20 mt-4" style={{ borderRadius: 'var(--radius-pill)' }} />
                  </div>

                  <div className="absolute bottom-8 text-[#9CA3AF]" style={{ fontSize: '13px', fontWeight: 500 }}>
                    탭하여 뒤집기
                  </div>
                </div>

                {/* Back Side */}
                <div
                  className="absolute inset-0 bg-white/95 backdrop-blur-lg p-6 overflow-y-auto scrollbar-hide rounded-[20px] border border-white/20 shadow-2xl"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  {/* Star Button - Top Right (on back side too) */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleAddToStarred}
                    className="absolute top-4 right-4 z-10"
                    style={{ transform: 'scaleX(-1)' }}
                  >
                    <motion.div
                      animate={isStarred ? {
                        scale: [1, 1.3, 1],
                        rotate: [0, -15, 15, 0],
                      } : {}}
                      transition={{ 
                        duration: 0.5,
                        ease: "easeOut"
                      }}
                    >
                      <Star className={`w-6 h-6 ${isStarred ? 'fill-[#FCD34D] text-[#FCD34D] drop-shadow-[0_0_8px_rgba(252,211,77,0.6)]' : 'text-[#D1D5DB]'}`} />
                    </motion.div>
                  </motion.button>

                  {/* Skull Button - Bottom Right (on back side too) */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleMoveToGraveyard}
                    className="absolute bottom-4 right-4 z-10"
                    style={{ transform: 'scaleX(-1)' }}
                  >
                    <Skull className="w-6 h-6 text-[#6B7280]" />
                  </motion.button>

                  <div className="flex flex-col gap-4 scrollable-content">
                    {/* Word Title (Small) */}
                    <div className="text-center pb-3 border-b border-gray-200">
                      <h3 className="text-[#491B6D]" style={{ fontSize: '24px', fontWeight: 700 }}>
                        {currentCard.word}
                      </h3>
                    </div>

                    {/* Meaning */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 bg-[#491B6D]" style={{ borderRadius: '2px' }} />
                        <h4 className="text-[#091A7A]" style={{ fontSize: '14px', fontWeight: 600 }}>
                          뜻
                        </h4>
                      </div>
                      <p className="text-[#374151] pl-3" style={{ fontSize: '16px', fontWeight: 500 }}>
                        {currentCard.meaning}
                      </p>
                    </div>

                    {/* Example */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 bg-[#491B6D]" style={{ borderRadius: '2px' }} />
                        <h4 className="text-[#091A7A]" style={{ fontSize: '14px', fontWeight: 600 }}>
                          예문
                        </h4>
                      </div>
                      <p className="text-[#6B7280] pl-3 italic" style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.6 }}>
                        {currentCard.example}
                      </p>
                    </div>

                    {/* Etymology */}
                    {currentCard.etymology && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-1 h-4 bg-[#491B6D]" style={{ borderRadius: '2px' }} />
                          <h4 className="text-[#091A7A]" style={{ fontSize: '14px', fontWeight: 600 }}>
                            어원
                          </h4>
                        </div>
                        <p className="text-[#6B7280] pl-3" style={{ fontSize: '13px', fontWeight: 400 }}>
                          {currentCard.etymology}
                        </p>
                      </div>
                    )}

                    {/* Synonyms */}
                    {currentCard.synonyms && currentCard.synonyms.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-1 h-4 bg-[#491B6D]" style={{ borderRadius: '2px' }} />
                          <h4 className="text-[#091A7A]" style={{ fontSize: '14px', fontWeight: 600 }}>
                            동의어
                          </h4>
                        </div>
                        <div className="flex flex-wrap gap-2 pl-3">
                          {currentCard.synonyms.map((syn, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-[#491B6D]/10 text-[#491B6D]"
                              style={{ fontSize: '12px', fontWeight: 500, borderRadius: 'var(--radius-small)' }}
                            >
                              {syn}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Antonyms */}
                    {currentCard.antonyms && currentCard.antonyms.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-1 h-4 bg-[#491B6D]" style={{ borderRadius: '2px' }} />
                          <h4 className="text-[#091A7A]" style={{ fontSize: '14px', fontWeight: 600 }}>
                            반의어
                          </h4>
                        </div>
                        <div className="flex flex-wrap gap-2 pl-3">
                          {currentCard.antonyms.map((ant, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-gray-100 text-[#6B7280]"
                              style={{ fontSize: '12px', fontWeight: 500, borderRadius: 'var(--radius-small)' }}
                            >
                              {ant}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Floating Control Buttons */}
      <div className="absolute bottom-8 left-0 right-0 z-[9999] flex items-center justify-center gap-3 px-4" style={{ pointerEvents: 'auto' }}>
        {/* Shuffle Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleShuffle}
          className="w-14 h-14 bg-white/95 backdrop-blur-lg rounded-full flex items-center justify-center shadow-xl"
        >
          <Shuffle className="w-5 h-5 text-[#8B5CF6]" />
        </motion.button>

        {/* Play Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleAutoPlay}
          disabled={isAutoPlaying}
          className={`w-16 h-16 backdrop-blur-lg rounded-full flex items-center justify-center shadow-xl ${
            isAutoPlaying
              ? 'bg-white/50 opacity-50'
              : 'bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED]'
          }`}
        >
          <Play className="w-7 h-7 text-white fill-white" />
        </motion.button>

        {/* Pause Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handlePause}
          disabled={!isAutoPlaying}
          className={`w-14 h-14 backdrop-blur-lg rounded-full flex items-center justify-center shadow-xl ${
            !isAutoPlaying
              ? 'bg-white/50 opacity-50'
              : 'bg-white/95'
          }`}
        >
          <Pause className="w-6 h-6 text-[#491B6D]" />
        </motion.button>

        {/* Stop Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleStop}
          className="w-14 h-14 bg-white/95 backdrop-blur-lg rounded-full flex items-center justify-center shadow-xl"
        >
          <Square className="w-5 h-5 text-[#EF4444] fill-[#EF4444]" />
        </motion.button>
      </div>
    </div>
  );
}