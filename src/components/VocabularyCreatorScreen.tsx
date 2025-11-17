import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, CheckCircle2, Plus, FolderPlus } from 'lucide-react';
import { StandardHeader } from './StandardHeader';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
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

const BATCH_SIZE = 20; // Client-side batch size
const CONCURRENCY_LIMIT = 3; // Number of parallel requests (safe for API rate limits)

export function VocabularyCreatorScreen({ onBack, onSaveComplete, getAuthToken }: VocabularyCreatorScreenProps) {
  const [vocabularyName, setVocabularyName] = useState(getDefaultVocabularyName());
  const [wordInput, setWordInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{ inputTokens: number; outputTokens: number } | null>(null);
  const [generatedWords, setGeneratedWords] = useState<any[]>([]);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // 모달 관련 상태
  const [showNewVocabModal, setShowNewVocabModal] = useState(false);
  const [showAddToExistingModal, setShowAddToExistingModal] = useState(false);
  const [existingVocabularies, setExistingVocabularies] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedExistingVocabId, setSelectedExistingVocabId] = useState('');
  const [isLoadingVocabs, setIsLoadingVocabs] = useState(false);

  const parsedWords = useMemo(() => {
    return wordInput
      .split(/[\n,]+/)
      .map((word) => word.trim())
      .filter(Boolean);
  }, [wordInput]);

  // 기존 단어장 목록 불러오기
  const fetchExistingVocabularies = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || getAuthToken?.();
    if (!token) return;

    setIsLoadingVocabs(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/user-vocabularies`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const vocabs = Array.isArray(data) ? data : (data.vocabularies || []);
        setExistingVocabularies(vocabs.map((v: any) => ({ id: v.id, title: v.title })));
      }
    } catch (error) {
      console.error('단어장 목록 불러오기 오류:', error);
    } finally {
      setIsLoadingVocabs(false);
    }
  };

  // Client-side batch processing helper with retry logic and limited concurrency
  const generateWordsInBatches = async (words: string[], token: string) => {
    const batches: string[][] = [];
    for (let i = 0; i < words.length; i += BATCH_SIZE) {
      batches.push(words.slice(i, i + BATCH_SIZE));
    }

    const allResults: { index: number; items: any[] }[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let completedCount = 0;

    setBatchProgress({ current: 0, total: batches.length });

    // Helper function to fetch single batch with retry
    const fetchBatchWithRetry = async (batch: string[], batchIndex: number, maxRetries = 3) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const generateResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/server/generate-vocabulary-batch`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                words: batch.map((word) => ({ word }))
              })
            }
          );

          const generateData = await generateResponse.json();
          if (!generateResponse.ok) {
            throw new Error(generateData?.error || `배치 ${batchIndex + 1} 생성 실패`);
          }

          const generatedItems = Array.isArray(generateData.results)
            ? generateData.results
            : Array.isArray(generateData.data)
              ? generateData.data
              : [];

          if (generateData.success === false || generatedItems.length === 0) {
            throw new Error(generateData?.error || `배치 ${batchIndex + 1} AI 응답 오류`);
          }

          return {
            index: batchIndex,
            items: generatedItems,
            inputTokens: generateData.inputTokens || 0,
            outputTokens: generateData.outputTokens || 0
          };
        } catch (error) {
          console.error(`❌ 배치 ${batchIndex + 1} 시도 ${attempt}/${maxRetries} 실패:`, error);

          if (attempt < maxRetries) {
            // Wait 2 seconds before retry (like Aesthetic)
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            throw error; // All retries exhausted
          }
        }
      }
      throw new Error(`배치 ${batchIndex + 1} 모든 재시도 실패`);
    };

    // Process batches with limited concurrency (parallel but controlled)
    const processBatchGroup = async (startIndex: number) => {
      const endIndex = Math.min(startIndex + CONCURRENCY_LIMIT, batches.length);
      const batchPromises = [];

      for (let i = startIndex; i < endIndex; i++) {
        batchPromises.push(fetchBatchWithRetry(batches[i], i));
      }

      const results = await Promise.all(batchPromises);

      for (const result of results) {
        allResults.push({ index: result.index, items: result.items });
        totalInputTokens += result.inputTokens;
        totalOutputTokens += result.outputTokens;
        completedCount++;

        setBatchProgress({ current: completedCount, total: batches.length });
        toast.loading(
          `AI가 단어를 분석 중... (${completedCount}/${batches.length} 배치, ${completedCount * BATCH_SIZE}/${words.length}개)`,
          { id: 'user-vocab-progress' }
        );
      }

      return endIndex;
    };

    // Process all batches in groups of CONCURRENCY_LIMIT
    let currentIndex = 0;
    while (currentIndex < batches.length) {
      currentIndex = await processBatchGroup(currentIndex);

      // Small delay between batch groups to avoid rate limiting
      if (currentIndex < batches.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    setBatchProgress(null);

    // Sort results by original index to maintain word order
    allResults.sort((a, b) => a.index - b.index);
    const finalResults = allResults.flatMap(r => r.items);

    return {
      results: finalResults,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens
    };
  };

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

      // Use client-side batching for large word lists
      const { results: generatedItems, inputTokens, outputTokens } = await generateWordsInBatches(parsedWords, token);

      if (generatedItems.length === 0) {
        throw new Error('AI 응답을 읽을 수 없습니다.');
      }

      toast.loading(`${generatedItems.length}개 단어 저장 중...`, { id: 'user-vocab-progress' });

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
        inputTokens: inputTokens || 0,
        outputTokens: outputTokens || 0
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
      setShowNewVocabModal(false);
    }
  };

  // 기존 단어장에 추가
  const handleAddToExisting = async () => {
    if (parsedWords.length === 0) {
      toast.error('단어를 하나 이상 입력해주세요.');
      return;
    }

    if (!selectedExistingVocabId) {
      toast.error('추가할 단어장을 선택해주세요.');
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

      // Use client-side batching for large word lists
      const { results: generatedItems, inputTokens, outputTokens } = await generateWordsInBatches(parsedWords, token);

      if (generatedItems.length === 0) {
        throw new Error('AI 응답을 읽을 수 없습니다.');
      }

      toast.loading(`${generatedItems.length}개 단어 저장 중...`, { id: 'user-vocab-progress' });

      // 기존 단어장에 추가
      const addResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/add-words-to-vocabulary`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            vocabularyId: selectedExistingVocabId,
            words: generatedItems
          })
        }
      );

      const addData = await addResponse.json();
      if (!addResponse.ok) {
        throw new Error(addData.error || '단어를 추가하지 못했습니다.');
      }

      const selectedVocab = existingVocabularies.find(v => v.id === selectedExistingVocabId);
      setGeneratedWords(generatedItems);
      setTokenInfo({
        inputTokens: inputTokens || 0,
        outputTokens: outputTokens || 0
      });
      setWordInput('');
      setSelectedExistingVocabId('');
      toast.success(`${selectedVocab?.title || '단어장'}에 ${generatedItems.length}개 단어가 추가되었어요! 🎉`, { id: 'user-vocab-progress' });

      if (onSaveComplete && selectedExistingVocabId) {
        onSaveComplete(selectedExistingVocabId, selectedVocab?.title || '');
      }
    } catch (error: any) {
      console.error('단어 추가 오류:', error);
      toast.error(error?.message || '단어 추가 중 오류가 발생했습니다.', { id: 'user-vocab-progress' });
    } finally {
      setIsProcessing(false);
      setShowAddToExistingModal(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#D4C5FF] to-[#E5D9FF]">
      <StandardHeader
        onBack={onBack}
        title="AI Vocabulary Maker"
        subtitle="단어만 넣으면 나머지는 AI가 채워줘요"
      />

      <div className="flex-1 overflow-auto px-4 pb-6">
        <div className="bg-white/95 backdrop-blur-xl border border-white/50 rounded-3xl shadow-xl p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-[#491B6D] mb-2">
              단어 목록 (엔터 또는 콤마 구분)
            </label>
            <Textarea
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              placeholder={'예) meticulous, resilience, nostalgia\n혹은 한 줄에 하나씩 입력해도 좋아요.'}
              className="min-h-[280px] resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              현재 {parsedWords.length}개의 단어가 감지되었습니다.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              disabled={isProcessing || parsedWords.length === 0}
              onClick={() => {
                if (parsedWords.length === 0) {
                  toast.error('단어를 하나 이상 입력해주세요.');
                  return;
                }
                setShowNewVocabModal(true);
              }}
              style={{ backgroundColor: '#7C3AED', color: '#FFFFFF' }}
              className="flex-1 h-12 text-base font-semibold rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5 mr-2" />
              {isProcessing ? 'AI가 열심히 만드는 중...' : '새 단어장 생성'}
            </button>
            <button
              disabled={isProcessing || parsedWords.length === 0}
              onClick={() => {
                if (parsedWords.length === 0) {
                  toast.error('단어를 하나 이상 입력해주세요.');
                  return;
                }
                fetchExistingVocabularies();
                setShowAddToExistingModal(true);
              }}
              style={{ backgroundColor: '#7C3AED', color: '#FFFFFF' }}
              className="flex-1 h-12 text-base font-semibold rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FolderPlus className="w-5 h-5 mr-2" />
              기존 단어장에 추가
            </button>
          </div>

          {batchProgress && (
            <div className="bg-white border border-[#C4B5FD] rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-[#7C3AED] font-semibold">
                <Sparkles className="w-5 h-5 animate-pulse" />
                AI가 단어를 생성 중...
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">
                배치 {batchProgress.current}/{batchProgress.total} 처리 중...
              </p>
            </div>
          )}

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

      {/* 새 단어장 생성 모달 */}
      {showNewVocabModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h3 className="text-lg font-bold text-[#491B6D] mb-4">새 단어장 이름</h3>
            <Input
              value={vocabularyName}
              onChange={(e) => setVocabularyName(e.target.value)}
              placeholder="단어장 이름을 입력하세요"
              className="mb-4"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowNewVocabModal(false)}
                className="flex-1"
                disabled={isProcessing}
              >
                취소
              </Button>
              <Button
                onClick={handleGenerateAndSave}
                className="flex-1"
                disabled={isProcessing}
              >
                {isProcessing ? '생성 중...' : '생성하기'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 기존 단어장에 추가 모달 */}
      {showAddToExistingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h3 className="text-lg font-bold text-[#491B6D] mb-4">기존 단어장 선택</h3>
            {isLoadingVocabs ? (
              <div className="text-center py-4 text-gray-500">단어장 목록을 불러오는 중...</div>
            ) : existingVocabularies.length === 0 ? (
              <div className="text-center py-4 text-gray-500">기존 단어장이 없습니다.</div>
            ) : (
              <Select value={selectedExistingVocabId} onValueChange={setSelectedExistingVocabId}>
                <SelectTrigger className="mb-4">
                  <SelectValue placeholder="단어장을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {existingVocabularies.map((vocab) => (
                    <SelectItem key={vocab.id} value={vocab.id}>
                      {vocab.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddToExistingModal(false);
                  setSelectedExistingVocabId('');
                }}
                className="flex-1"
                disabled={isProcessing}
              >
                취소
              </Button>
              <Button
                onClick={handleAddToExisting}
                className="flex-1"
                disabled={isProcessing || !selectedExistingVocabId}
              >
                {isProcessing ? '추가 중...' : '추가하기'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
