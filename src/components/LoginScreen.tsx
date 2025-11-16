import { motion } from 'motion/react';
import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import logo from 'figma:asset/aeb1623adfde368b33dc26e61638e23dfc50bf84.png';
import { getSupabaseClient } from '../utils/supabase/client';

interface LoginScreenProps {
  onLoginComplete: (user: any, token: string) => void;
  onGoToSignup: () => void;
}

export function LoginScreen({ onLoginComplete, onGoToSignup }: LoginScreenProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      console.log('🔐 Signing in with Supabase Auth...');
      
      // ✅ Use singleton Supabase client
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        console.error('❌ Supabase signin error:', error);
        
        // 더 친절한 에러 메시지
        let errorMessage = '로그인에 실패했습니다.';
        
        if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
          errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.\n계정이 없으시면 회원가입을 해주세요.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = '이메일 인증이 필요합니다.';
        } else {
          errorMessage = error.message;
        }
        
        throw new Error(errorMessage);
      }

      // ✅ Validate response structure
      console.log('📦 Login response:', data);
      
      if (!data.session || !data.session.access_token) {
        console.error('❌ Invalid response structure:', data);
        throw new Error('서버 응답이 올바르지 않습니다. 잠시 후 다시 시도해주세요.');
      }

      const accessToken = data.session.access_token;
      const user = data.user;

      // Save token to localStorage
      localStorage.setItem('supabase_access_token', accessToken);
      localStorage.setItem('supabase_user', JSON.stringify(user));

      console.log('✅ Login successful, token saved');
      console.log('🔑 Access token:', accessToken.substring(0, 20) + '...');
      
      onLoginComplete(user, accessToken);
    } catch (err: any) {
      console.error('❌ Login error:', err);
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && formData.email && formData.password) {
      handleLogin();
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 min-h-screen bg-gradient-to-b from-[#D4C5FF] via-[#E5D9FF] to-white">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12 text-center"
      >
        <img src={logo} alt="JEJEVOCA" className="w-32 h-32 mx-auto mb-4" />
        <h1 className="text-[#491B6D] mb-2">JEJEVOCA</h1>
        <p className="text-gray-600">단어 학습의 새로운 기준</p>
      </motion.div>

      {/* Login Form */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-sm"
      >
        <div className="bg-white/80 backdrop-blur-lg border border-white/30 rounded-3xl p-8 shadow-xl space-y-6">
          {/* Email Input */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">이메일</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="example@email.com"
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#491B6D]/30 transition-all"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#491B6D]/30 transition-all"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-3 text-center"
            >
              <p className="text-red-600 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Login Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleLogin}
            disabled={isLoading || !formData.email || !formData.password}
            className={`w-full py-4 rounded-2xl font-medium transition-all min-h-[56px] text-center ${
              isLoading || !formData.email || !formData.password
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#491B6D] text-white shadow-lg shadow-[#491B6D]/30'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>로그인 중...</span>
              </div>
            ) : (
              '로그인'
            )}
          </motion.button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">또는</span>
            </div>
          </div>

          {/* Signup Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onGoToSignup}
            className="w-full py-4 rounded-2xl font-medium bg-white border-2 border-[#491B6D] text-[#491B6D] transition-all min-h-[56px] text-center"
          >
            회원가입
          </motion.button>
          
          {/* Test Account Info */}
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-xl">
            <p className="text-xs text-purple-700 text-center">
              💡 계정이 없으신가요? 위의 <strong>회원가입</strong> 버튼을 눌러주세요!
            </p>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-8 text-center text-gray-600 text-sm"
      >
        © JEJETRANSFER. All rights reserved. · Made by 제제샘
      </motion.div>
    </div>
  );
}