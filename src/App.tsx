import { VocabularyCreatorScreen } from './components/VocabularyCreatorScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { SubjectDetailScreen } from './components/SubjectDetailScreen';
import { VideosScreen } from './components/VideosScreen';
import { VocabularyListScreen } from './components/VocabularyListScreen';
import { LessonPlayerScreen } from './components/LessonPlayerScreen';
import { ProgressNotification } from './components/ProgressNotification';
import { InlineXPNotification } from './components/InlineXPNotification';
import { ProgressManager, UserProgress, ProgressUtils } from './components/ProgressManager';
import { ProgressSaveIndicator, useSaveStatus } from './components/ProgressSaveIndicator';
import { LoginScreen } from './components/LoginScreen';
import { SignupScreen } from './components/SignupScreen';
import { TextExtractorScreen } from './components/TextExtractorScreen';
import { WordListScreen } from './components/WordListScreen';
import { FlashcardScreen } from './components/FlashcardScreen';
import { GiftScreen } from './components/GiftScreen';
import { WordSelectionScreen } from './components/WordSelectionScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { FullCalendarScreen } from './components/FullCalendarScreen';
import ExportPage from './ExportPage';
import ExportPrintPage from './ExportPrintPage';
import { AdminAdmissionApp } from './admission/admin/AdminAdmissionApp';
import { StudentCalendarScreen } from './admission/student/CalendarScreen';
import profileImage from 'figma:asset/1627f3a870e9b56d751d07f53392d7a84aa55817.png';
import { projectId, publicAnonKey } from './utils/supabase/info';
import { useAuth } from './hooks/useAuth';
import { useWordLists } from './hooks/useWordLists';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Header } from './components/Header';
import { SubjectsSection } from './components/SubjectsSection';
import { ProgressCard } from './components/ProgressCard';
import { DailyStreak } from './components/DailyStreak';
import { CalendarWidget } from './components/CalendarWidget';
import { BottomNavigation } from './components/BottomNavigation';
import { QuizScreen } from './components/QuizScreen';
import { GameMapQuizScreen } from './components/GameMapQuizScreen';
import { QuizCompletionScreen } from './components/QuizCompletionScreen';
import { AITutorScreen } from './components/AITutorScreen';

export type Screen = 'login' | 'signup' | 'home' | 'quiz' | 'game-map-quiz' | 'quiz-completion' | 'ai' | 'profile' | 'subject-detail' | 'videos' | 'vocabulary-list' | 'lesson-player' | 'text-extractor' | 'word-list' | 'flashcard' | 'gift' | 'word-selection' | 'vocabulary-creator' | 'full-calendar';

export interface Subject {
  id: string;
  name: string;
  description: string;
  progress: number;
  icon: React.ReactNode;
  color: string;
}

export default function App() {
  // Export Route - Check first before any other logic
  if (window.location.pathname.startsWith('/admin/admission')) {
    return <AdminAdmissionApp />;
  }

  if (window.location.pathname.startsWith('/student/calendar')) {
    return <StudentCalendarScreen />;
  }

  if (window.location.pathname.startsWith('/export/print')) {
    return <ExportPrintPage />;
  }

  if (window.location.pathname === '/export') {
    return <ExportPage />;
  }

  // ============================================
  // HOOKS
  // ============================================
  const auth = useAuth();
  const wordLists = useWordLists(auth.getAuthToken);
  const { saveStatus, showIndicator, triggerSave } = useSaveStatus();
  
  // ============================================
  // STATE
  // ============================================
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [navigationStack, setNavigationStack] = useState<Screen[]>(['login']);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [selectedVocabulary, setSelectedVocabulary] = useState<{ id: string; title: string } | null>(null);
  const [vocabularyWords, setVocabularyWords] = useState<any[]>([]); // 단어 데이터 저장
  const [selectedSharedVocabulary, setSelectedSharedVocabulary] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userXP, setUserXP] = useState(5500);
  const [streakCount, setStreakCount] = useState(3);
  const [lastActiveDate, setLastActiveDate] = useState<string>(new Date().toDateString());
  const [completionData, setCompletionData] = useState({
    xpGained: 0,
    completionTime: '0:00',
    accuracy: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    stageName: ''
  });
  const [currentProgress, setCurrentProgress] = useState(40);
  const [totalQuizzesCompleted, setTotalQuizzesCompleted] = useState(2);
  const [showXPAnimation, setShowXPAnimation] = useState(false);
  const [recentXPGain, setRecentXPGain] = useState(0);
  const [showProgressNotification, setShowProgressNotification] = useState(false);
  const [notificationData, setNotificationData] = useState({
    type: 'xp-gain' as const,
    title: '',
    subtitle: '',
    xpGain: 0
  });
  const [showInlineXP, setShowInlineXP] = useState(false);
  const [levelProgress, setLevelProgress] = useState(ProgressUtils.calculateLevel(5500));
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedDday, setSelectedDday] = useState<{ name: string; date: Date; color: string } | null>({
    name: '서울대학교 원서접수',
    date: new Date(2025, 8, 15), // Sep 15, 2025
    color: '#8B5CF6'
  });
  const [showDdayModal, setShowDdayModal] = useState(false);
  const [showWordList, setShowWordList] = useState(false);
  
  const illustrationImage = "https://images.unsplash.com/photo-1743247299142-8f1c919776c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHwzZCUyMGNoYXJhY3RlciUyMGxlYXJuaW5nJTIwaWxsdXN0cmF0aW9ufGVufDF8fHx8MTc1NzQzMTU5MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

  // Navigation helper functions
  const navigateToScreen = (screen: Screen) => {
    console.log('[Navigate] Going to screen:', screen);
    setNavigationStack(prev => [...prev, screen]);
    setCurrentScreen(screen);
  };

  const navigateBack = () => {
    setNavigationStack(prev => {
      if (prev.length > 1) {
        const newStack = [...prev];
        newStack.pop(); // Remove current screen
        const previousScreen = newStack[newStack.length - 1];
        setCurrentScreen(previousScreen);
        
        // Clean up state when going back
        if (previousScreen === 'home') {
          setSelectedSubject(null);
          setSelectedLesson(null);
        }
        
        return newStack;
      }
      return prev;
    });
  };

  const handleSubjectClick = (subject: Subject) => {
    // If starred, graveyard, or wrong-answers, go directly to word list screen
    if (subject.id === 'starred' || subject.id === 'graveyard' || subject.id === 'wrong-answers') {
      setSelectedSubject(subject);
      navigateToScreen('word-list');
    } else {
      setSelectedSubject(subject);
      navigateToScreen('subject-detail');
    }
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
    setNavigationStack(['home']);
    setSelectedSubject(null);
    setSelectedLesson(null);
  };

  const handleXPGain = (points: number) => {
    const oldXP = userXP;
    const newXP = oldXP + points;
    
    setRecentXPGain(points);
    setShowXPAnimation(true);
    setUserXP(newXP);
    
    // Update level progress
    const newLevelProgress = ProgressUtils.calculateLevel(newXP);
    setLevelProgress(newLevelProgress);
    
    // Check for level up
    const leveledUp = ProgressUtils.checkForLevelUp(oldXP, newXP);
    if (leveledUp) {
      setNotificationData({
        type: 'level-up',
        title: `Level ${newLevelProgress.currentLevel}!`,
        subtitle: 'You leveled up! Keep going!',
        xpGain: points
      });
      setShowProgressNotification(true);
    } else {
      // Show immediate inline XP feedback
      setShowInlineXP(true);
      setTimeout(() => setShowInlineXP(false), 2000);
      
      // Show detailed XP gain notification for larger amounts
      if (points >= 25) {
        setNotificationData({
          type: 'xp-gain',
          title: 'Excellent Work!',
          subtitle: 'You earned bonus XP!',
          xpGain: points
        });
        setShowProgressNotification(true);
      }
    }
    
    // Trigger save indicator
    triggerProgressSave();
  };

  const handleStreakIncrease = () => {
    const today = new Date().toDateString();
    
    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    // If already studied today, don't increase streak
    if (lastActiveDate === today) {
      console.log('📅 Already studied today - streak maintained');
      return;
    }
    
    // If studied yesterday, increase streak
    if (lastActiveDate === yesterdayStr) {
      setStreakCount(prev => prev + 1);
      setLastActiveDate(today);
      
      // Show streak notification
      setNotificationData({
        type: 'streak',
        title: 'Streak Extended!',
        subtitle: `${streakCount + 1} days in a row!`,
        xpGain: 0
      });
      setShowProgressNotification(true);
      
      console.log(`🔥 Streak extended to ${streakCount + 1} days!`);
    } 
    // If more than 1 day gap, reset streak to 1
    else {
      setStreakCount(1);
      setLastActiveDate(today);
      
      // Show streak reset notification
      setNotificationData({
        type: 'streak',
        title: 'Streak Started!',
        subtitle: 'Keep going to build your streak!',
        xpGain: 0
      });
      setShowProgressNotification(true);
      
      console.log('🔄 Streak reset to 1 day');
    }
    
    // Trigger save indicator
    triggerProgressSave();
  };

  const handleLessonClick = (lessonTitle: string) => {
    setSelectedLesson(lessonTitle);
    navigateToScreen('lesson-player');
  };

  const handleQuizCompletion = (data: {
    xpGained: number;
    completionTime: string;
    accuracy: number;
    totalQuestions: number;
    correctAnswers: number;
    stageName: string;
  }) => {
    setCompletionData(data);
    
    // Update progress and stats
    setTotalQuizzesCompleted(prev => prev + 1);
    const newProgress = Math.min(100, currentProgress + (data.accuracy >= 50 ? 20 : 10));
    setCurrentProgress(newProgress);
    
    // Real-time XP gain
    const oldXP = userXP;
    const newXP = oldXP + data.xpGained;
    setRecentXPGain(data.xpGained);
    setShowXPAnimation(true);
    setUserXP(newXP);
    
    // Update level progress
    const newLevelProgress = ProgressUtils.calculateLevel(newXP);
    setLevelProgress(newLevelProgress);
    
    // Check for level up
    const leveledUp = ProgressUtils.checkForLevelUp(oldXP, newXP);
    
    // Show completion notification
    setTimeout(() => {
      if (leveledUp) {
        setNotificationData({
          type: 'level-up',
          title: `Level ${newLevelProgress.currentLevel}!`,
          subtitle: 'Quiz completed with a level up!',
          xpGain: data.xpGained
        });
      } else {
        setNotificationData({
          type: 'quiz-complete',
          title: 'Quiz Completed!',
          subtitle: `${data.correctAnswers}/${data.totalQuestions} correct • ${data.accuracy}% accuracy`,
          xpGain: data.xpGained
        });
      }
      setShowProgressNotification(true);
    }, 1000);
    
    // Trigger save indicator
    triggerProgressSave();
    
    navigateToScreen('quiz-completion');
  };

  const handleXPAnimationComplete = () => {
    setShowXPAnimation(false);
    setRecentXPGain(0);
  };

  const handleNotificationComplete = () => {
    setShowProgressNotification(false);
  };

  // Handle progress loading from storage
  const handleProgressLoaded = (progress: UserProgress) => {
    setUserXP(progress.userXP);
    setStreakCount(progress.streakCount);
    setLastActiveDate(progress.lastActiveDate);
    setCurrentProgress(progress.currentProgress);
    setTotalQuizzesCompleted(progress.totalQuizzesCompleted);
    setLevelProgress(progress.levelProgress);
    setCompletedStages(progress.completedStages);
    setAchievements(progress.achievements);
    console.log('📊 Progress loaded:', progress);
  };

  // Trigger save indicator when progress changes
  const triggerProgressSave = () => {
    triggerSave();
  };

  const handleRetakeQuiz = () => {
    navigateToScreen('game-map-quiz');
  };

  const handleNextChallenge = () => {
    setCurrentScreen('home');
    setNavigationStack(['home']);
    setSelectedSubject(null);
    setSelectedLesson(null);
  };

  const handleOpeningComplete = () => {
    navigateToScreen('signup');
  };

  const handleSignupComplete = (user: any, token: string) => {
    console.log('✅ Signup complete! User:', user.id);
    auth.login(user, token);
    navigateToScreen('home');
    
    // ✅ 로그인 후 즉시 단어 목록 로드
    setTimeout(() => {
      console.log('🔄 Loading word lists after login...');
      wordLists.loadWordLists();
    }, 100); // 약간의 지연으로 토큰이 확실히 저장되도록
  };

  const handleAdminAccess = () => {
    setShowAdmin(true);
  };

  const handleAdminClose = () => {
    setShowAdmin(false);
  };

  const handleLogout = () => {
    if (confirm('정말 로그아웃 하시겠습니까?')) {
      // Use auth hook's logout
      auth.logout();
      
      // Clear all user progress data
      setUserXP(0);
      setStreakCount(0);
      setCompletedStages([]);
      
      // Navigate to login screen
      setCurrentScreen('login');
      setNavigationStack(['login']);
      
      console.log('✅ Logged out successfully');
    }
  };

  // Load vocabulary words when selectedVocabulary changes
  useEffect(() => {
    const loadVocabularyWords = async () => {
      if (!selectedVocabulary || !selectedVocabulary.id) {
        setVocabularyWords([]);
        return;
      }

      // Don't load for special sections
      if (selectedVocabulary.id === 'starred' || selectedVocabulary.id === 'graveyard' || selectedVocabulary.id === 'wrong-answers') {
        return;
      }

      try {
        console.log(`🔄 Loading words for vocabulary: ${selectedVocabulary.id}`);
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/server/user-vocabularies/${selectedVocabulary.id}`,
          {
            headers: {
              'Authorization': `Bearer ${auth.getAuthToken()}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to load vocabulary words');
        }

        const data = await response.json();
        console.log(`✅ Loaded ${data.words?.length || 0} words for vocabulary`);
        setVocabularyWords(data.words || []);
      } catch (error) {
        console.error('❌ Error loading vocabulary words:', error);
        setVocabularyWords([]);
      }
    };

    loadVocabularyWords();
  }, [selectedVocabulary?.id]); // Only depend on the ID string, not the whole object

  // Handle authentication redirects
  useEffect(() => {
    // Redirect to home if authenticated but on login/signup screen
    if (auth.isAuthenticated && (currentScreen === 'login' || currentScreen === 'signup')) {
      setCurrentScreen('home');
      setNavigationStack(['home']);
    }
    // Redirect to login if not authenticated and not on login/signup
    else if (!auth.isAuthenticated && currentScreen !== 'login' && currentScreen !== 'signup') {
      setCurrentScreen('login');
      setNavigationStack(['login']);
    }
  }, [auth.isAuthenticated, currentScreen]);

  // ✅ Auto-load word lists when app mounts and user is authenticated
  useEffect(() => {
    if (auth.isAuthenticated && !auth.isInitializing) {
      console.log('🚀 App mounted with authenticated user, loading word lists...');
      // Small delay to ensure token is ready
      setTimeout(() => {
        wordLists.loadWordLists();
      }, 200);
    }
  }, [auth.isAuthenticated, auth.isInitializing]);

  const renderScreen = () => {
    // ✅ Wait for auth initialization
    if (auth.isInitializing) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    switch (currentScreen) {
      case 'login':
        return <LoginScreen onLoginComplete={handleSignupComplete} onGoToSignup={() => navigateToScreen('signup')} />;
      case 'signup':
        return <SignupScreen onBack={() => navigateToScreen('login')} onSignupComplete={handleSignupComplete} />;
      case 'home':
        return (
          <div className="space-y-6">
            <Header 
              profileImage={profileImage} 
              userXP={userXP}
              recentXPGain={recentXPGain}
              showXPAnimation={showXPAnimation}
              onXPAnimationComplete={handleXPAnimationComplete}
              levelProgress={levelProgress}
              onAdminAccess={handleAdminAccess}
              ddayInfo={selectedDday}
              onDdayClick={() => setShowDdayModal(true)}
              onLogout={handleLogout}
            />
            <SubjectsSection 
              onSubjectClick={handleSubjectClick} 
              starredCount={wordLists.starredWords.length}
              graveyardCount={wordLists.graveyardWords.length}
              wrongAnswersCount={wordLists.wrongAnswersWords.length}
            />
            <div className="px-6">
              <ProgressCard 
                illustrationImage={illustrationImage} 
                onStartQuiz={() => navigateToScreen('vocabulary-list')}
                currentProgress={currentProgress}
                totalQuizzesCompleted={totalQuizzesCompleted}
              />
            </div>
            <div className="px-6">
              <DailyStreak streakCount={streakCount} />
            </div>
            <div className="px-6">
              <CalendarWidget onClick={() => navigateToScreen('full-calendar')} />
            </div>
            {/* Copyright Footer */}
            <div className="px-6 pb-4 pt-3">
              <div className="text-center text-gray-600" style={{ fontSize: '11px' }}>
                © JEJETRANSFER. All rights reserved. · Made by 제제샘
              </div>
            </div>
          </div>
        );
      case 'quiz':
        return <QuizScreen onBack={navigateBack} onXPGain={handleXPGain} onStreakIncrease={handleStreakIncrease} />;
      case 'game-map-quiz':
        return <GameMapQuizScreen 
          onBack={navigateBack}
          onBackToHome={handleBackToHome}
          onXPGain={handleXPGain} 
          onStreakIncrease={handleStreakIncrease} 
          userXP={userXP} 
          streakCount={streakCount} 
          selectedSubject={selectedSubject} 
          vocabularyTitle={selectedVocabulary?.title} 
          onQuizCompletion={handleQuizCompletion}
          onWrongAnswer={wordLists.addWrongAnswer}
          starredWordIds={wordLists.starredWords}
          graveyardWordIds={wordLists.graveyardWords}
          wrongAnswersWordIds={wordLists.wrongAnswersWords}
          onAddToStarred={wordLists.toggleStarred}
          onMoveToGraveyard={wordLists.moveToGraveyard}
          onDeletePermanently={wordLists.deletePermanently}
          getAuthToken={auth.getAuthToken}
        />;
      case 'quiz-completion':
        return <QuizCompletionScreen 
          onBack={navigateBack}
          onRetakeQuiz={handleRetakeQuiz}
          onNextChallenge={handleNextChallenge}
          userXP={userXP}
          xpGained={completionData.xpGained}
          streakCount={streakCount}
          completionTime={completionData.completionTime}
          accuracy={completionData.accuracy}
          totalQuestions={completionData.totalQuestions}
          correctAnswers={completionData.correctAnswers}
          stageName={completionData.stageName}
        />;
      case 'ai':
        return <AITutorScreen onBack={navigateBack} />;
      case 'profile':
        return <ProfileScreen onBack={navigateBack} userXP={userXP} streakCount={streakCount} profileImage={profileImage} levelProgress={levelProgress} />;
      case 'videos':
        return <VideosScreen onBack={navigateBack} getAuthToken={auth.getAuthToken} />;
      case 'vocabulary-list':
        return <VocabularyListScreen 
          key={Date.now()} // Force remount when navigating to this screen
          onBack={navigateBack} 
          onSelectVocabulary={(id, title) => {
            setSelectedVocabulary({ id, title });
            setSelectedSubject({ 
              id: id, 
              name: title, 
              description: '', 
              progress: 0, 
              icon: null, 
              color: '#491B6D' 
            });
            navigateToScreen('game-map-quiz');
          }}
          getAuthToken={auth.getAuthToken}
        />;
      case 'subject-detail':
        return selectedSubject ? (
          <SubjectDetailScreen 
            subject={selectedSubject} 
            onBack={navigateBack}
            onStartQuiz={() => navigateToScreen('game-map-quiz')}
            onLessonClick={handleLessonClick}
          />
        ) : null;
      case 'lesson-player':
        return <LessonPlayerScreen 
          onBack={navigateBack} 
          onTakeQuiz={() => navigateToScreen('game-map-quiz')} 
          lessonTitle={selectedLesson || 'Introduction to Algebra'}
        />;
      case 'text-extractor':
        return <TextExtractorScreen onBack={navigateBack} />;
      case 'word-list':
        return selectedSubject ? (
          <WordListScreen
            onBack={navigateBack}
            onBackToHome={handleBackToHome}
            vocabularyTitle={selectedSubject.name}
            unitName={selectedSubject.id === 'starred' ? 'Starred Collection' : selectedSubject.id === 'graveyard' ? 'Graveyard Collection' : selectedSubject.id === 'wrong-answers' ? 'Wrong Answers Collection' : 'Unit 1'}
            vocabularyWords={vocabularyWords}
            filterType={selectedSubject.id === 'starred' ? 'starred' : selectedSubject.id === 'graveyard' ? 'graveyard' : selectedSubject.id === 'wrong-answers' ? 'wrong-answers' : 'all'}
            starredWordIds={wordLists.starredWords}
            graveyardWordIds={wordLists.graveyardWords}
            wrongAnswersWordIds={wordLists.wrongAnswersWords}
            onAddToStarred={wordLists.toggleStarred}
            onMoveToGraveyard={wordLists.moveToGraveyard}
            onDeletePermanently={wordLists.deletePermanently}
            onStartFlashcards={() => {
              console.log('[App] onStartFlashcards called, navigating to flashcard');
              navigateToScreen('flashcard');
            }}
          />
        ) : null;
      case 'flashcard':
        console.log('[App] === FLASHCARD SCREEN RENDERING ===');
        console.log('[App] starredWords:', wordLists.starredWords);
        console.log('[App] graveyardWords:', wordLists.graveyardWords);
        console.log('[App] vocabularyWords for flashcard:', vocabularyWords.length);
        return <FlashcardScreen 
          onBack={navigateBack} 
          onBackToHome={handleBackToHome}
          vocabularyWords={vocabularyWords}
          starredWordIds={wordLists.starredWords}
          graveyardWordIds={wordLists.graveyardWords}
          onAddToStarred={wordLists.toggleStarred}
          onMoveToGraveyard={wordLists.moveToGraveyard}
        />;
      case 'gift':
        return <GiftScreen 
          onBack={navigateBack} 
          onSelectVocabulary={(vocab) => {
            setSelectedSharedVocabulary(vocab);
            navigateToScreen('word-selection');
          }}
        />;
      case 'word-selection':
        return selectedSharedVocabulary ? (
          <WordSelectionScreen 
            vocabularyId={selectedSharedVocabulary.id}
            vocabularyName={selectedSharedVocabulary.title}
            totalWords={selectedSharedVocabulary.total_words || 0}
            onBack={navigateBack}
            onComplete={async (selectedWordIds, wordsPerUnit) => {
              try {
                console.log('📚 Adding shared vocabulary to user collection...');
                console.log('Selected words:', selectedWordIds.length);
                console.log('Words per unit:', wordsPerUnit);
                
                // Get full word details from shared vocabulary
                const response = await fetch(
                  `https://${projectId}.supabase.co/functions/v1/server/shared-vocabulary/${selectedSharedVocabulary.id}/words`,
                  {
                    headers: {
                      'Authorization': `Bearer ${publicAnonKey}`,
                    },
                  }
                );
                
                const data = await response.json();
                const allWords = data.words || [];
                
                // Filter selected words
                const selectedWords = allWords.filter((word: any) => 
                  selectedWordIds.includes(word.id)
                );
                
                // Call Supabase API to add to user collection
                const addResponse = await fetch(
                  `https://${projectId}.supabase.co/functions/v1/server/user-vocabularies/add-shared`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${auth.getAuthToken()}`,
                    },
                    body: JSON.stringify({
                      sharedVocabId: selectedSharedVocabulary.id,
                      title: selectedSharedVocabulary.title,
                      description: selectedSharedVocabulary.description || '',
                      wordsPerUnit,
                      selectedWords,
                    }),
                  }
                );
                
                const result = await addResponse.json();
                if (result.vocabulary) {
                  console.log('✅ Successfully added vocabulary to user collection');
                  alert(`"${selectedSharedVocabulary.title}" 단어장이 추가되었습니다! (${selectedWords.length}개 단어, ${Math.ceil(selectedWords.length / wordsPerUnit)}개 유닛)`);
                } else {
                  throw new Error(result.error || 'Failed to add vocabulary');
                }
              } catch (error) {
                console.error('❌ Error adding vocabulary:', error);
                alert('단어장 추가에 실패했습니다.');
              } finally {
                setSelectedSharedVocabulary(null);
                handleBackToHome();
              }
            }}
          />
        ) : null;
      case 'vocabulary-creator':
        return <VocabularyCreatorScreen 
          onBack={navigateBack}
          getAuthToken={auth.getAuthToken}
          onSaveComplete={(vocabId, vocabTitle) => {
            // 단어장 생성 완료 후 바로 해당 단어장의 WordList로 이동
            console.log(`✅ Vocabulary created: ${vocabId}, navigating to WordList`);
            
            // 단어장 목록 새로고침
            wordLists.refreshMyVocabularies();
            
            setSelectedVocabulary({ id: vocabId, title: vocabTitle });
            setSelectedSubject({
              id: vocabId,
              name: vocabTitle,
              description: '',
              progress: 0,
              icon: null,
              color: '#491B6D'
            });
            navigateToScreen('word-list');
          }}
        />; 
      case 'full-calendar':
        return <FullCalendarScreen onBack={navigateBack} onHomeClick={handleBackToHome} />;
      default:
        return null;
    }
  };

  return (
    <div 
      className="min-h-screen overflow-hidden flex flex-col"
      style={{
        background: currentScreen === 'word-list' && selectedSubject
          ? selectedSubject.id === 'starred'
            ? 'linear-gradient(to bottom, #FFFEF5, #FFFEF8, #FFFFF9)'
            : selectedSubject.id === 'graveyard'
            ? 'linear-gradient(to bottom, #FCFCFC, #FAFAFA, #F9F9F9)'
            : selectedSubject.id === 'wrong-answers'
            ? 'linear-gradient(to bottom, #FFFAFA, #FFFCFC, #FFF9F9)'
            : 'linear-gradient(to bottom, #D4C5FF, rgba(229, 217, 255, 0.95), white)'
          : 'linear-gradient(to bottom, #D4C5FF, rgba(229, 217, 255, 0.95), white)'
      }}
    >
      {/* Admin Dashboard Overlay */}
      {showAdmin && <AdminDashboard onClose={handleAdminClose} />}

      {/* Progress Manager - Invisible component for handling saves */}
      <ProgressManager
        userXP={userXP}
        streakCount={streakCount}
        lastActiveDate={lastActiveDate}
        currentProgress={currentProgress}
        totalQuizzesCompleted={totalQuizzesCompleted}
        onProgressLoaded={handleProgressLoaded}
      />

      {/* Main Content - Perfectly scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-hide relative">
        {/* Opening Animation - No transition wrapper needed */}
        {currentScreen === 'opening' ? (
          renderScreen()
        ) : (
          /* Modern Screen Transition Animation for all other screens */
          <motion.div
            key={currentScreen}
            initial={{ 
              opacity: 0, 
              scale: currentScreen === 'welcome' ? 0.95 : (currentScreen === 'home' ? 1 : 0.98),
              y: currentScreen === 'welcome' ? 20 : (currentScreen === 'home' ? 0 : 15),
              filter: 'blur(8px)'
            }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              y: 0,
              filter: 'blur(0px)'
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.95,
              y: -15,
              filter: 'blur(4px)'
            }}
            transition={{ 
              duration: currentScreen === 'welcome' ? 0.8 : 0.5,
              ease: currentScreen === 'welcome' ? [0.23, 1, 0.32, 1] : "easeInOut",
              type: currentScreen === 'welcome' ? "spring" : "tween",
              bounce: currentScreen === 'welcome' ? 0.25 : 0
            }}
          >
            {/* Enhanced Transition Effects for Welcome Screen */}
            {currentScreen === 'welcome' && (
              <>
                {/* Subtle Particle Background */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="absolute inset-0 pointer-events-none"
                >
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ 
                        x: Math.random() * 400,
                        y: Math.random() * 800,
                        opacity: 0,
                        scale: 0
                      }}
                      animate={{ 
                        opacity: [0, 0.4, 0],
                        scale: [0, 1, 0],
                        x: [
                          Math.random() * 400,
                          Math.random() * 400,
                          Math.random() * 400
                        ],
                        y: [
                          Math.random() * 800,
                          Math.random() * 800 + 50,
                          Math.random() * 800 + 100
                        ]
                      }}
                      transition={{
                        duration: 6,
                        delay: Math.random() * 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        background: `linear-gradient(45deg, #C8B6FF, #7C3AED)`,
                        filter: 'blur(1px)'
                      }}
                    />
                  ))}
                </motion.div>

                {/* Gradient Overlay for Enhanced Depth */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: [0, 0.3, 0],
                    background: [
                      'radial-gradient(circle at 30% 20%, #C8B6FF 0%, transparent 50%)',
                      'radial-gradient(circle at 70% 60%, #7C3AED 0%, transparent 40%)',
                      'radial-gradient(circle at 20% 80%, #C8B6FF 0%, transparent 60%)'
                    ]
                  }}
                  transition={{ 
                    opacity: { duration: 2, ease: "easeInOut" },
                    background: { duration: 8, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="absolute inset-0 pointer-events-none"
                />
              </>
            )}

            {renderScreen()}
          </motion.div>
        )}
        
        {/* Progress Notification */}
        <ProgressNotification
          show={showProgressNotification}
          type={notificationData.type}
          title={notificationData.title}
          subtitle={notificationData.subtitle}
          xpGain={notificationData.xpGain}
          onComplete={handleNotificationComplete}
        />
        
        {/* Inline XP Notification - Quick feedback */}
        <InlineXPNotification
          show={showInlineXP}
          xpGain={recentXPGain}
        />
        
        {/* Progress Save Indicator */}
        <ProgressSaveIndicator
          show={showIndicator}
          status={saveStatus}
        />
        
        {/* Bottom padding for navigation */}
        <div className={currentScreen === 'subject-detail' || currentScreen === 'lesson-player' || currentScreen === 'game-map-quiz' || currentScreen === 'vocabulary-list' || currentScreen === 'word-list' ? 'h-8' : 'h-28'} />
      </div>
      
      {/* Bottom Navigation - Fixed positioning - Hidden on opening, signup, welcome, subject detail, lesson player, game map quiz, vocabulary list, word list, full-calendar, and completion screens */}
      {currentScreen !== 'login' && currentScreen !== 'signup' && currentScreen !== 'opening' && currentScreen !== 'welcome' && currentScreen !== 'subject-detail' && currentScreen !== 'lesson-player' && currentScreen !== 'game-map-quiz' && currentScreen !== 'vocabulary-list' && currentScreen !== 'word-list' && currentScreen !== 'quiz-completion' && currentScreen !== 'full-calendar' && (
        <BottomNavigation currentScreen={currentScreen} onScreenChange={(screen) => {
          if (screen === 'home') {
            handleBackToHome();
          } else {
            navigateToScreen(screen);
          }
        }} />
      )}
    </div>
  );
}
