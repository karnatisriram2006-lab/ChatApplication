'use client';

import { ReceiptStatus } from '@/types';

interface TickIconProps {
  status: ReceiptStatus;
  readerCount?: number;
  isGroup?: boolean;
}

function SingleTick({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="11"
      viewBox="0 0 16 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Sent"
    >
      <path
        d="M1 5.5L5 9.5L14 1"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DoubleTick({ color, label }: { color: string; label: string }) {
  return (
    <svg
      width="20"
      height="11"
      viewBox="0 0 20 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={label}
    >
      <path
        d="M5 5.5L9 9.5L18 1"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1 5.5L5 9.5L9 5.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TickIcon({
  status,
  readerCount = 0,
  isGroup = false,
}: TickIconProps) {
  // For own messages on dark bubbles: white tints
  // For received messages: use CSS vars
  const greyColor = 'var(--tick-grey, rgba(255,255,255,0.4))';
  const blueColor = 'var(--tick-blue, rgba(255,255,255,0.85))';

  if (isGroup) {
    const color = readerCount > 0 ? blueColor : greyColor;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
        <DoubleTick color={color} label={readerCount > 0 ? 'Read' : 'Delivered'} />
        {readerCount > 0 && (
          <span
            style={{
              fontSize: '10px',
              color,
              fontWeight: 500,
              lineHeight: 1,
            }}
          >
            {readerCount > 99 ? '99+' : readerCount}
          </span>
        )}
      </span>
    );
  }

  switch (status) {
    case 'sent':
      return <SingleTick color={greyColor} />;
    case 'delivered':
      return <DoubleTick color={greyColor} label="Delivered" />;
    case 'read':
      return <DoubleTick color={blueColor} label="Read" />;
    default:
      return <SingleTick color={greyColor} />;
  }
}
