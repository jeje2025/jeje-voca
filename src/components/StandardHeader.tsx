import { BackButton } from './BackButton';

interface StandardHeaderProps {
  onBack: () => void;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
}

export function StandardHeader({ onBack, title, subtitle, rightElement }: StandardHeaderProps) {
  return (
    <div className="sticky top-0 z-40 backdrop-blur-lg" style={{ background: 'transparent' }}>
      <div className="flex items-center justify-between p-8">
        <BackButton onClick={onBack} />

        <div className="flex flex-col items-center">
          <h1 className="text-[#091A7A]" style={{ fontSize: '18px', fontWeight: 600 }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-[#6B7280]" style={{ fontSize: '12px', fontWeight: 500 }}>
              {subtitle}
            </p>
          )}
        </div>

        {rightElement || <div className="w-11 h-11" />}
      </div>
    </div>
  );
}
