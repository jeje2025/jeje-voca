import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, X, Shuffle, Sparkles, Trophy, Target } from 'lucide-react';

interface MeaningMatchGameProps {
  words: Array<{
    id: string;
    word: string;
    meaning: string;
  }>;
  mode: 'word-to-meaning' | 'meaning-to-word';
  onComplete: (score: number, correctCount: number) => void;
  onWrongAnswer?: (wordId: string) => void;
}

interface MatchCard {
  id: string;
  content: string;
  type: 'left' | 'right';
  matched: boolean;
  wordId: string;
}

export function MeaningMatchGame({ words, mode, onComplete, onWrongAnswer }: MeaningMatchGameProps) {
  const [leftCards, setLeftCards] = useState<MatchCard[]>([]);
  const [rightCards, setRightCards] = useState<MatchCard[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [wrongAttempt, setWrongAttempt] = useState<{ left: string; right: string } | null>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    initializeGame();
  }, [words, mode]);

  const initializeGame = () => {
    // Take up to 5 words for the matching game
    const gameWords = words.slice(0, 5);
    
    // Shuffle function
    const shuffle = <T,>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    if (mode === 'word-to-meaning') {
      // Left: words, Right: meanings
      const left: MatchCard[] = gameWords.map((w, i) => ({
        id: `left-${i}`,
        content: w.word,
        type: 'left' as const,
        matched: false,
        wordId: w.id
      }));

      const right: MatchCard[] = shuffle(gameWords.map((w, i) => ({
        id: `right-${i}`,
        content: w.meaning,
        type: 'right' as const,
        matched: false,
        wordId: w.id
      })));

      setLeftCards(left);
      setRightCards(right);
    } else {
      // Left: meanings, Right: words
      const left: MatchCard[] = gameWords.map((w, i) => ({
        id: `left-${i}`,
        content: w.meaning,
        type: 'left' as const,
        matched: false,
        wordId: w.id
      }));

      const right: MatchCard[] = shuffle(gameWords.map((w, i) => ({
        id: `right-${i}`,
        content: w.word,
        type: 'right' as const,
        matched: false,
        wordId: w.id
      })));

      setLeftCards(left);
      setRightCards(right);
    }

    setMatchedPairs(new Set());
    setSelectedLeft(null);
    setSelectedRight(null);
    setScore(0);
    setAttempts(0);
  };

  const handleCardClick = (card: MatchCard) => {
    if (card.matched) return;

    if (card.type === 'left') {
      setSelectedLeft(selectedLeft === card.id ? null : card.id);
    } else {
      setSelectedRight(selectedRight === card.id ? null : card.id);
    }
  };

  useEffect(() => {
    if (selectedLeft && selectedRight) {
      checkMatch();
    }
  }, [selectedLeft, selectedRight]);

  const checkMatch = () => {
    const leftCard = leftCards.find(c => c.id === selectedLeft);
    const rightCard = rightCards.find(c => c.id === selectedRight);

    if (!leftCard || !rightCard) return;

    setAttempts(prev => prev + 1);

    if (leftCard.wordId === rightCard.wordId) {
      // Correct match!
      const newMatched = new Set(matchedPairs);
      newMatched.add(leftCard.id);
      newMatched.add(rightCard.id);
      setMatchedPairs(newMatched);

      setLeftCards(prev => prev.map(c => 
        c.id === leftCard.id ? { ...c, matched: true } : c
      ));
      setRightCards(prev => prev.map(c => 
        c.id === rightCard.id ? { ...c, matched: true } : c
      ));

      setScore(prev => prev + 1);
      setSelectedLeft(null);
      setSelectedRight(null);

      // Check if game is complete
      if (newMatched.size === leftCards.length * 2) {
        setTimeout(() => {
          onComplete(score + 1, score + 1);
        }, 1000);
      }
    } else {
      // Wrong match
      setWrongAttempt({ left: leftCard.id, right: rightCard.id });
      if (onWrongAnswer) {
        onWrongAnswer(leftCard.wordId);
      }
      
      setTimeout(() => {
        setWrongAttempt(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 800);
    }
  };

  const getCardStyle = (card: MatchCard, isSelected: boolean) => {
    if (card.matched) {
      return 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white border-emerald-300';
    }
    if (wrongAttempt && (wrongAttempt.left === card.id || wrongAttempt.right === card.id)) {
      return 'bg-gradient-to-br from-red-400 to-red-600 text-white border-red-300 animate-shake';
    }
    if (isSelected) {
      return 'bg-gradient-to-br from-purple-500 to-purple-700 text-white border-purple-300 scale-95';
    }
    return 'bg-white border-purple-200 text-[#491B6D]';
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg" style={{ fontWeight: 700, color: '#491B6D' }}>
              {mode === 'word-to-meaning' ? '단어 → 뜻' : '뜻 → 단어'}
            </h2>
            <p className="text-xs" style={{ color: '#8B5CF6' }}>
              카드를 터치해서 짝을 맞추세요
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl" style={{ fontWeight: 800, color: '#491B6D' }}>
            {score}/{leftCards.length}
          </div>
          <div className="text-xs" style={{ color: '#8B5CF6' }}>
            {attempts} 시도
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left Column */}
        <div className="flex-1 space-y-3 overflow-y-auto">
          {leftCards.map((card) => (
            <motion.button
              key={card.id}
              whileTap={{ scale: card.matched ? 1 : 0.95 }}
              onClick={() => handleCardClick(card)}
              disabled={card.matched}
              className={`w-full min-h-[80px] p-4 rounded-2xl border-2 transition-all duration-200 ${getCardStyle(
                card,
                selectedLeft === card.id
              )}`}
              style={{ touchAction: 'manipulation' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm flex-1 text-left" style={{ fontWeight: 600 }}>
                  {card.content}
                </span>
                {card.matched && <CheckCircle className="w-5 h-5 ml-2 flex-shrink-0" />}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Right Column */}
        <div className="flex-1 space-y-3 overflow-y-auto">
          {rightCards.map((card) => (
            <motion.button
              key={card.id}
              whileTap={{ scale: card.matched ? 1 : 0.95 }}
              onClick={() => handleCardClick(card)}
              disabled={card.matched}
              className={`w-full min-h-[80px] p-4 rounded-2xl border-2 transition-all duration-200 ${getCardStyle(
                card,
                selectedRight === card.id
              )}`}
              style={{ touchAction: 'manipulation' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm flex-1 text-left" style={{ fontWeight: 600 }}>
                  {card.content}
                </span>
                {card.matched && <CheckCircle className="w-5 h-5 ml-2 flex-shrink-0" />}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Retry Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={initializeGame}
        className="mt-6 w-full py-4 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-2xl flex items-center justify-center gap-2"
      >
        <Shuffle className="w-5 h-5" />
        <span style={{ fontWeight: 700 }}>다시 섞기</span>
      </motion.button>
    </div>
  );
}
