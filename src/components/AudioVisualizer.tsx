/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { AssistantState } from '../types';

interface AudioVisualizerProps {
  state: AssistantState;
  audioEnergy?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ state, audioEnergy = 0 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let step = 0;

    const render = () => {
      step += 0.07;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barCount = 32;
      const barWidth = 3;
      const gap = 4;
      const totalWidth = barCount * (barWidth + gap);
      const startX = (canvas.width - totalWidth) / 2;
      const centerY = canvas.height / 2;

      for (let i = 0; i < barCount; i++) {
        let height = 4;
        const normalizedIdx = Math.abs(i - barCount / 2) / (barCount / 2); // 0 at center, 1 at ends

        if (state === 'listening') {
          const wave = Math.sin(step * 2 + i * 0.35) * 12;
          const energyBoost = audioEnergy * 35;
          height = Math.max(4, (18 - normalizedIdx * 10) + wave + energyBoost * (1 - normalizedIdx * 0.5));
        } else if (state === 'speaking') {
          const wave = Math.abs(Math.sin(step * 2.5 + i * 0.4)) * 22;
          height = Math.max(6, (20 - normalizedIdx * 12) + wave);
        } else if (state === 'processing') {
          const wave = (Math.sin(step * 4 + i * 0.6) + 1) * 8;
          height = 6 + wave;
        } else if (state === 'error') {
          height = 4 + (i % 2 === 0 ? 8 : 2);
        } else {
          // Idle breathing
          height = 3 + Math.sin(step + i * 0.2) * 2;
        }

        const x = startX + i * (barWidth + gap);
        const y = centerY - height / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + height);
        if (state === 'error') {
          gradient.addColorStop(0, '#f43f5e');
          gradient.addColorStop(1, '#881337');
        } else {
          gradient.addColorStop(0, '#22d3ee');
          gradient.addColorStop(0.5, '#0284c7');
          gradient.addColorStop(1, '#1e3a8a');
        }

        ctx.fillStyle = gradient;
        ctx.shadowColor = state === 'error' ? '#f43f5e' : '#06b6d4';
        ctx.shadowBlur = state !== 'idle' ? 6 : 2;
        ctx.fillRect(x, y, barWidth, height);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [state, audioEnergy]);

  return (
    <div className="w-full flex justify-center py-2">
      <canvas ref={canvasRef} width={280} height={48} className="opacity-95" />
    </div>
  );
};
