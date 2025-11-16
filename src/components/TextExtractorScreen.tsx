import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Camera, BookOpen, MessageSquare, Lightbulb, Sparkles, Check } from 'lucide-react';

interface TextExtractorScreenProps {
  onBack: () => void;
}

export function TextExtractorScreen({ onBack }: TextExtractorScreenProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');

  const options = [
    { id: 'word', label: '단어', sublabel: 'Word', icon: BookOpen },
    { id: 'translation', label: '해석', sublabel: 'Translation', icon: MessageSquare },
    { id: 'explanation', label: '해설', sublabel: 'Explanation', icon: Lightbulb }
  ];

  const toggleOption = (optionId: string) => {
    setSelectedOptions(prev => 
      prev.includes(optionId)
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        // TODO: Implement OCR or image processing
        console.log('Camera image captured:', file);
      }
    };
    input.click();
  };

  const handleSubmit = () => {
    if (!inputText.trim() || selectedOptions.length === 0) {
      return;
    }

    // TODO: Process the text with selected options
    console.log('Processing text:', {
      text: inputText,
      options: selectedOptions
    });
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#D4C5FF] to-[#E5D9FF]">
      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: 'transparent' }}>
        <div className="flex items-center justify-between p-5 backdrop-blur-xl border-b border-white/20">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="w-11 h-11 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/40"
          >
            <ArrowLeft className="w-5 h-5 text-[#491B6D]" />
          </motion.button>
          
          <div className="text-center">
            <h1 className="text-lg" style={{ fontWeight: 700, color: '#491B6D' }}>
              Word Extractor
            </h1>
            <p className="text-xs" style={{ color: '#6B7280' }}>텍스트를 분석하여 단어를 추출합니다</p>
          </div>
          
          <div className="w-11 h-11" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-8">
        <div className="pt-2">
          {/* Stats Cards - 3 Column Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {options.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedOptions.includes(option.id);
              
              return (
                <motion.button
                  key={option.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleOption(option.id)}
                  className="relative bg-white/90 border border-gray-200 p-3 shadow-sm transition-all"
                  style={{ borderRadius: 'var(--radius-standard)' }}
                >
                  {/* Check Mark */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#491B6D] rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                  
                  {/* Icon */}
                  <div className="flex justify-center mb-2">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-[#491B6D]' : 'bg-[#491B6D]/10'
                    }`}>
                      <Icon 
                        className={`w-5 h-5 ${
                          isSelected ? 'text-white' : 'text-[#491B6D]'
                        }`} 
                      />
                    </div>
                  </div>
                  
                  {/* Label */}
                  <div className="text-center">
                    <div className="text-[#091A7A]" style={{ fontSize: '13px', fontWeight: 600 }}>
                      {option.label}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Text Input Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/95 backdrop-blur-lg p-6 shadow-lg"
            style={{ borderRadius: 'var(--radius-subject)' }}
          >
            {/* Header with Camera Button */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#091A7A]" style={{ fontSize: '16px', fontWeight: 700 }}>
                지문 입력
              </h2>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCameraCapture}
                className="w-10 h-10 bg-[#491B6D]/10 flex items-center justify-center"
                style={{ borderRadius: 'var(--radius-small)' }}
              >
                <Camera className="w-5 h-5 text-[#491B6D]" />
              </motion.button>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="여기에 지문을 붙여넣거나 입력하세요..."
              className="w-full h-64 p-4 bg-[#F9FAFB] border border-gray-200 focus:border-[#491B6D] focus:outline-none resize-none text-[#374151] transition-colors"
              style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.6', borderRadius: 'var(--radius-standard)' }}
            />
          </motion.div>

          {/* Submit Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={!inputText.trim() || selectedOptions.length === 0}
            className={`w-full p-5 shadow-lg transition-all mt-4 ${
              inputText.trim() && selectedOptions.length > 0
                ? 'bg-gradient-to-r from-[#491B6D] to-[#5E2278] opacity-100'
                : 'bg-gray-300 opacity-50'
            }`}
            style={{ borderRadius: 'var(--radius-subject)' }}
          >
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-white" />
              <span className="text-white" style={{ fontSize: '16px', fontWeight: 600 }}>
                문제 추출 시작하기
              </span>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}