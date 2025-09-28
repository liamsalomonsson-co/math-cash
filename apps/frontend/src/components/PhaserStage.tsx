import { useEffect, useRef } from 'react';
import { createGame } from '../phaser/createGame';
import type { PhaserGameHandle } from '../phaser/types';

interface Props {
  className?: string;
}

export default function PhaserStage({ className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<PhaserGameHandle | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    handleRef.current = createGame(containerRef.current);

    return () => {
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className ?? 'phaser-stage'}
      role="presentation"
      aria-hidden="true"
      style={{
        width: 'min(90vw, 520px)',
        height: 'min(90vw, 520px)',
        aspectRatio: '1 / 1',
        margin: '0 auto 24px auto',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
        background: 'radial-gradient(circle at top, #1d3557, #0b1e3f)',
      }}
    />
  );
}
