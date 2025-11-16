import { useState, useEffect, useCallback } from 'react';
import { projectId } from '../utils/supabase/info';

export function useWordLists(getAuthToken: () => string | null) {
  const [starredWords, setStarredWords] = useState<string[]>([]);
  const [graveyardWords, setGraveyardWords] = useState<string[]>([]);
  const [wrongAnswersWords, setWrongAnswersWords] = useState<string[]>([]);
  const [myVocabularies, setMyVocabularies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false); // ✅ 기본값을 false로 변경
  const [hasLoaded, setHasLoaded] = useState(false);

  // API 호출 wrapper
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    
    // ✅ 토큰이 없으면 에러 발생
    if (!token) {
      throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
    }
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/server${endpoint}`,
      {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    
    const data = await response.json();
    
    // ✅ 더 자세한 에러 로깅
    if (!response.ok) {
      console.error(`❌ API Error [${response.status}] ${endpoint}:`, data);
      
      if (response.status === 401) {
        // 서버에서 반환한 실제 에러 메시지 사용
        throw new Error(data.message || data.error || '인증이 만료되었습니다. 다시 로그인해주세요.');
      }
      
      throw new Error(data.error || data.message || '요청 실패');
    }
    
    return data;
  }, [getAuthToken]);

  // 단어 목록 로드 함수
  const loadWordLists = useCallback(async () => {
    // ✅ 토큰이 없으면 로드하지 않음
    const token = getAuthToken();
    if (!token) {
      console.log('⏭️ Skipping word lists load - no auth token');
      setIsLoading(false);
      return;
    }
    
    // 이미 로드 중이거나 로드 완료되었으면 무시
    if (isLoading || hasLoaded) {
      return;
    }
    
    try {
      console.log('🔄 Loading word lists...');
      setIsLoading(true);

      const [starredData, graveyardData, wrongAnswersData, myVocabulariesData] = await Promise.all([
        apiCall('/starred'),
        apiCall('/graveyard'),
        apiCall('/wrong-answers'),
        apiCall('/my-vocabularies'),
      ]);

      if (starredData.words) {
        setStarredWords(starredData.words.map((w: any) => w.id));
        console.log(`⭐ Loaded ${starredData.words.length} starred words`);
      }

      if (graveyardData.words) {
        setGraveyardWords(graveyardData.words.map((w: any) => w.id));
        console.log(`💀 Loaded ${graveyardData.words.length} graveyard words`);
      }

      if (wrongAnswersData.words) {
        setWrongAnswersWords(wrongAnswersData.words.map((w: any) => w.id));
        console.log(`❌ Loaded ${wrongAnswersData.words.length} wrong answers words`);
      }

      if (myVocabulariesData.vocabularies) {
        setMyVocabularies(myVocabulariesData.vocabularies);
        console.log(`📚 Loaded ${myVocabulariesData.vocabularies.length} my vocabularies`);
      }

      console.log('✅ Word lists loaded');
      setHasLoaded(true);
    } catch (error: any) {
      // ✅ 더 자세한 에러 로깅
      console.error('❌ Failed to load user vocabularies:', {
        code: error.code,
        message: error.message,
        fullError: error
      });
      
      // ✅ JWT 에러면 토큰 정보도 로깅
      if (error.message?.includes('JWT') || error.message?.includes('인증')) {
        const token = getAuthToken();
        console.error('🔍 Token check:', {
          hasToken: !!token,
          tokenPrefix: token ? token.substring(0, 20) + '...' : 'null'
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken, apiCall, isLoading, hasLoaded]);

  // 별표 토글
  const toggleStarred = useCallback(async (wordId: string) => {
    const isStarred = starredWords.includes(wordId);
    
    // UI 먼저 업데이트
    if (isStarred) {
      setStarredWords(prev => prev.filter(id => id !== wordId));
    } else {
      setStarredWords(prev => [...prev, wordId]);
    }

    // 서버 동기화
    try {
      await apiCall(`/starred/${wordId}`, {
        method: isStarred ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      console.log(`⭐ ${isStarred ? 'Removed' : 'Added'} starred: ${wordId}`);
    } catch (error) {
      console.error('❌ Error toggling starred:', error);
      // 실패시 롤백
      if (isStarred) {
        setStarredWords(prev => [...prev, wordId]);
      } else {
        setStarredWords(prev => prev.filter(id => id !== wordId));
      }
    }
  }, [starredWords, apiCall]);

  // 무덤으로 이동
  const moveToGraveyard = useCallback(async (wordId: string) => {
    // UI 먼저 업데이트
    if (!graveyardWords.includes(wordId)) {
      setGraveyardWords(prev => [...prev, wordId]);
    }
    setStarredWords(prev => prev.filter(id => id !== wordId));
    setWrongAnswersWords(prev => prev.filter(id => id !== wordId));

    // 서버 동기화
    try {
      await apiCall(`/graveyard/${wordId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      console.log(`💀 Moved to graveyard: ${wordId}`);
    } catch (error) {
      console.error('❌ Error moving to graveyard:', error);
    }
  }, [graveyardWords, apiCall]);

  // 영구 삭제
  const deletePermanently = useCallback(async (wordId: string) => {
    // UI 먼저 업데이트
    setGraveyardWords(prev => prev.filter(id => id !== wordId));
    setStarredWords(prev => prev.filter(id => id !== wordId));
    setWrongAnswersWords(prev => prev.filter(id => id !== wordId));

    // 서버 동기화
    try {
      await apiCall(`/graveyard/${wordId}`, { method: 'DELETE' });
      console.log(`🗑️ Permanently deleted: ${wordId}`);
    } catch (error) {
      console.error('❌ Error deleting permanently:', error);
    }
  }, [apiCall]);

  // 오답 추가
  const addWrongAnswer = useCallback(async (wordId: string) => {
    // 이미 있으면 무시
    if (wrongAnswersWords.includes(wordId)) return;

    // UI 먼저 업데이트
    setWrongAnswersWords(prev => [...prev, wordId]);

    // 서버 동기화
    try {
      await apiCall(`/wrong-answers/${wordId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      console.log(`❌ Added wrong answer: ${wordId}`);
    } catch (error) {
      console.error('❌ Error adding wrong answer:', error);
    }
  }, [wrongAnswersWords, apiCall]);

  // 내 단어장 목록 새로고침
  const refreshMyVocabularies = useCallback(async () => {
    try {
      console.log('🔄 Refreshing my vocabularies...');
      const data = await apiCall('/my-vocabularies');
      if (data.vocabularies) {
        setMyVocabularies(data.vocabularies);
        console.log(`📚 Refreshed ${data.vocabularies.length} my vocabularies`);
      }
    } catch (error) {
      console.error('❌ Error refreshing vocabularies:', error);
    }
  }, [apiCall]);

  return {
    starredWords,
    graveyardWords,
    wrongAnswersWords,
    myVocabularies,
    isLoading,
    loadWordLists, // ✅ Export loadWordLists
    toggleStarred,
    moveToGraveyard,
    deletePermanently,
    addWrongAnswer,
    refreshMyVocabularies,
  };
}
