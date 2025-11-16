import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';

interface VocabularyCreatorScreenProps {
  onBack: () => void;
  onSaveComplete?: (vocabId: string, vocabTitle: string) => void;
  getAuthToken?: () => string;
}

const getDefaultVocabularyName = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const createVocabularyId = () => {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `vocab_${Math.random().toString(36).slice(2)}`;
};

const supabase = getSupabaseClient();

export function VocabularyCreatorScreen({ onBack, onSaveComplete, getAuthToken }: VocabularyCreatorScreenProps) {
  const [vocabularyName, setVocabularyName] = useState(getDefaultVocabularyName());
  const [wordInput, setWordInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{ inputTokens: number; outputTokens: number } | null>(null);
  const [generatedWords, setGeneratedWords] = useState<any[]>([]);

  const parsedWords = useMemo(() => {
    return wordInput
      .split(/[\n,]+/)
      .map((word) => word.trim())
      .filter(Boolean);
  }, [wordInput]);

  const handleGenerateAndSave = async () => {
    if (parsedWords.length === 0) {
      toast.error('단어를 하나 이상 입력해주세요.');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || getAuthToken?.();
    if (!token) {
      toast.error('로그인이 필요합니다. 다시 로그인해주세요.');
      return;
    }

    setIsProcessing(true);
    setTokenInfo(null);
    setGeneratedWords([]);

    try {
      toast.dismiss('user-vocab-progress');
      toast.loading(`AI가 ${parsedWords.length}개 단어를 분석 중입니다…`, { id: 'user-vocab-progress' });

      const generateResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/generate-vocabulary-batch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            words: parsedWords.map((word) => ({ word }))
          })
        }
      );

      const generateData = await generateResponse.json();
      if (!generateResponse.ok) {
        throw new Error(generateData?.error || 'AI 생성 실패');
      }

      const generatedItems = Array.isArray(generateData.results)
        ? generateData.results
        : Array.isArray(generateData.data)
          ? generateData.data
          : [];

      if ((generateData.success === false) || generatedItems.length === 0) {
        throw new Error(generateData?.error || 'AI 응답을 읽을 수 없습니다.');
      }

      const vocabularyId = createVocabularyId();
      const saveResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/save-vocabulary`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            vocabularyId,
            title: vocabularyName.trim() || getDefaultVocabularyName(),
            category: 'My Own',
            level: 'Beginner',
            words: generatedItems
          })
        }
      );

      const saveData = await saveResponse.json();
      if (!saveResponse.ok) {
        throw new Error(saveData.error || '단어장을 저장하지 못했습니다.');
      }

      setGeneratedWords(generatedItems);
      setTokenInfo({
        inputTokens: generateData.inputTokens || 0,
        outputTokens: generateData.outputTokens || 0
      });
      setWordInput('');
      setVocabularyName(getDefaultVocabularyName());
      toast.success('단어장이 생성되어 My Own에 저장되었어요! 🎉', { id: 'user-vocab-progress' });

      if (onSaveComplete && saveData.vocabulary?.id) {
        onSaveComplete(saveData.vocabulary.id, saveData.vocabulary.title || vocabularyName);
      }
    } catch (error: any) {
      console.error('단어장 생성 오류:', error);
      toast.error(error?.message || '단어장 생성 중 오류가 발생했습니다.', { id: 'user-vocab-progress' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#D4C5FF] to-[#E5D9FF]">
      <div className="flex items-center justify-between p-6 pb-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="w-11 h-11 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/40"
        >
          <ArrowLeft className="w-5 h-5 text-[#491B6D]" />
        </motion.button>

        <div className="text-center">
          <h1 className="text-lg font-bold text-[#491B6D]">AI Vocabulary Maker</h1>
          <p className="text-xs text-gray-600">단어만 넣으면 나머지는 AI가 채워줘요</p>
        </div>

        <div className="w-11 h-11" />
      </div>

      <div className="flex-1 overflow-auto px-4 pb-6">
        <div className="bg-white/95 backdrop-blur-xl border border-white/50 rounded-3xl shadow-xl p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-[#491B6D] mb-2">단어장 이름</label>
            <Input
              value={vocabularyName}
              onChange={(e) => setVocabularyName(e.target.value)}
              placeholder="자동으로 오늘 날짜가 들어가요"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#491B6D] mb-2">
              단어 목록 (엔터 또는 콤마 구분)
            </label>
            <Textarea
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              placeholder={'예) meticulous, resilience, nostalgia\n혹은 한 줄에 하나씩 입력해도 좋아요.'}
              className="min-h-[160px] resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              현재 {parsedWords.length}개의 단어가 감지되었습니다.
            </p>
          </div>

          <div className="bg-[#F4EEFF] rounded-2xl border border-white/60 p-4 flex items-center gap-3">
            <Sparkles className="w-10 h-10 text-[#7C3AED]" />
            <div className="text-sm text-[#4B5563]">
              <p className="font-semibold text-[#491B6D]">AI가 대신 채워줘요</p>
              <p>
                발음, 영영 정의, 동·반의어, 예문, 번역, 어원까지 자동으로 만들어져요. 입력은 단어만 하면 됩니다.
              </p>
            </div>
          </div>

          <Button
            disabled={isProcessing || parsedWords.length === 0}
            onClick={handleGenerateAndSave}
            className="w-full h-12 text-base font-semibold"
          >
            {isProcessing ? 'AI가 열심히 만드는 중...' : `AI로 ${parsedWords.length || ''}개 단어장 만들기`}
          </Button>

          {generatedWords.length > 0 && (
            <div className="bg-white border border-dashed border-[#C4B5FD] rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-[#2563EB] font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                방금 생성되어 저장된 단어장
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                {generatedWords.slice(0, 10).map((word) => (
                  <div key={`${word.word}-${word.meaning}`} className="px-3 py-2 bg-[#F5F3FF] rounded-lg">
                    <span className="font-semibold text-[#5B21B6]">{word.word}</span>
                    <span className="ml-2 text-xs text-gray-500">{word.partOfSpeech}</span>
                    <p className="text-xs text-gray-600 truncate">{word.meaning}</p>
                  </div>
                ))}
              </div>
              {generatedWords.length > 10 && (
                <p className="text-xs text-gray-500">
                  나머지 {generatedWords.length - 10}개 단어도 함께 저장되었습니다.
                </p>
              )}

              {tokenInfo && (
                <div className="text-xs text-gray-500">
                  📊 토큰 사용량 — 입력 {tokenInfo.inputTokens.toLocaleString()} / 출력 {tokenInfo.outputTokens.toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
