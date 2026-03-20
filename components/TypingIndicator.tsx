'use client';

interface TypingIndicatorProps {
  label: string;
}

export default function TypingIndicator({ label }: TypingIndicatorProps) {
  if (!label) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 16px 8px',
        minHeight: '28px',
      }}
    >
      <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: 'var(--color-text-tertiary)',
              animation: `typingBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontSize: '12px',
          color: 'var(--color-text-secondary)',
          fontStyle: 'italic',
        }}
      >
        {label}
      </span>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
