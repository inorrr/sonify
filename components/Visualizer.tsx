import React, { useRef, useEffect } from 'react';
import * as Tone from 'tone';

interface VisualizerProps {
  analyser: Tone.Analyser | null;
  isPlaying: boolean;
  color?: string;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, isPlaying, color = '#60A5FA' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!isPlaying) {
        // Clear canvas if stopped
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      animationRef.current = requestAnimationFrame(draw);

      const values = analyser.getValue(); // Returns Float32Array
      // Check if values is actually an array (Tone.js typings can be tricky)
      if (values instanceof Float32Array) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.beginPath();

        const sliceWidth = canvas.width / values.length;
        let x = 0;

        for (let i = 0; i < values.length; i++) {
          const v = values[i] as number; 
          // Scale value (-1 to 1) to canvas height
          const y = (0.5 + v / 2) * canvas.height;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isPlaying, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={600} 
      height={150} 
      className="w-full h-full rounded-xl opacity-80"
    />
  );
};

export default Visualizer;