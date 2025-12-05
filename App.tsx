
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Music, Volume2, StopCircle, RefreshCw, Wand2, Loader2, Image as ImageIcon, Sliders } from 'lucide-react';
import { generateSoundBlueprint } from './services/geminiService';
import { soundEngine } from './services/soundEngine';
import Visualizer from './components/Visualizer';
import { AppState, SoundBlueprint, SoundGenre } from './types';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [blueprint, setBlueprint] = useState<SoundBlueprint | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Genre Selection
  const [selectedGenre, setSelectedGenre] = useState<SoundGenre>('Ambient');
  const genres: SoundGenre[] = ['Ambient', 'Cinematic', 'Lofi', 'Cyberpunk', 'Meditation', 'Abstract'];

  // Use a ref to track if engine is ready, though engine handles its own state mostly
  const audioContextReady = useRef(false);

  // Handle Image Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Reset state if re-uploading
      if (state !== AppState.IDLE) {
        soundEngine.stop();
        setState(AppState.IDLE);
        setBlueprint(null);
      }
    }
  };

  // Main Generation Flow
  const handleGenerate = async () => {
    if (!imageFile) return;

    try {
      setState(AppState.ANALYZING);
      setError(null);

      // 1. Initialize Audio Context (must be user triggered)
      if (!audioContextReady.current) {
        await soundEngine.init();
        audioContextReady.current = true;
      }

      // 2. Call Gemini
      const generatedBlueprint = await generateSoundBlueprint(imageFile, selectedGenre);
      setBlueprint(generatedBlueprint);

      // 3. Configure Engine
      setState(AppState.SYNTHESIZING);
      soundEngine.configure(generatedBlueprint);
      
      // 4. Start Playback
      // Small delay to let synthesis nodes settle
      setTimeout(() => {
        soundEngine.start();
        setState(AppState.PLAYING);
      }, 500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate soundscape.");
      setState(AppState.ERROR);
    }
  };

  const handleStop = () => {
    soundEngine.stop();
    setState(AppState.IDLE);
  };

  const handleReplay = () => {
    if (state === AppState.PLAYING) return;
    if (!blueprint) return;
    soundEngine.start();
    setState(AppState.PLAYING);
  };

  // Drag and Drop handlers
  const [isDragging, setIsDragging] = useState(false);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
       // Manual change event simulation
       const file = e.dataTransfer.files[0];
       if(file.type.startsWith('image/')) {
         setImageFile(file);
         const reader = new FileReader();
         reader.onloadend = () => setImagePreview(reader.result as string);
         reader.readAsDataURL(file);
         soundEngine.stop();
         setState(AppState.IDLE);
         setBlueprint(null);
       }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center p-6 selection:bg-indigo-500 selection:text-white">
      
      {/* Header */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-12 mt-4">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Volume2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            Sonify.ai
          </h1>
        </div>
        <a href="https://github.com" target="_blank" rel="noreferrer" className="text-neutral-500 hover:text-white transition-colors text-sm font-medium">
          Powered by Gemini 2.5
        </a>
      </header>

      <main className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Column: Input & Preview */}
        <div className="space-y-6">
          
          {/* Upload Area */}
          <div 
            className={`
              relative group rounded-2xl border-2 border-dashed transition-all duration-300 h-96 flex flex-col items-center justify-center overflow-hidden
              ${isDragging ? 'border-indigo-500 bg-indigo-900/10' : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'}
              ${imagePreview ? 'border-transparent' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {imagePreview ? (
              <>
                <img 
                  src={imagePreview} 
                  alt="Uploaded" 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* Overlay for re-uploading */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                   <label className="cursor-pointer px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-neutral-200 transition-colors">
                    Change Image
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                </div>
              </>
            ) : (
              <label className="cursor-pointer flex flex-col items-center gap-4 p-8 text-center z-10">
                <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-neutral-400 group-hover:text-indigo-400" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-lg text-neutral-200">Drop your image here</p>
                  <p className="text-sm text-neutral-500">or click to browse</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
            )}
          </div>

          {/* Genre Selection & Action */}
          {imagePreview && state === AppState.IDLE && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3">
                <Sliders className="w-4 h-4 text-neutral-500" />
                <span className="text-sm font-medium text-neutral-400">Select Style</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {genres.map(genre => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className={`
                      px-3 py-2 rounded-lg text-sm font-medium transition-all
                      ${selectedGenre === genre 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30 ring-1 ring-indigo-400' 
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'}
                    `}
                  >
                    {genre}
                  </button>
                ))}
              </div>

              <button
                onClick={handleGenerate}
                className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-lg shadow-lg shadow-indigo-900/20 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 mt-4"
              >
                <Wand2 className="w-5 h-5" />
                Generate Soundscape
              </button>
            </div>
          )}

          {/* Loading States */}
          {(state === AppState.ANALYZING || state === AppState.SYNTHESIZING) && (
            <div className="w-full py-4 rounded-xl bg-neutral-800 text-neutral-300 font-medium flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              {state === AppState.ANALYZING ? "Analyzing visual semantics..." : "Synthesizing audio textures..."}
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-900/20 border border-red-800/50 text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Right Column: Output & Visualization */}
        <div className="space-y-6">
          
          {/* Status Card */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 min-h-[300px] flex flex-col relative overflow-hidden">
             
             {/* Background decorative blob */}
             <div className={`absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] transition-opacity duration-1000 ${state === AppState.PLAYING ? 'opacity-100' : 'opacity-0'}`} />

             <h2 className="text-lg font-medium text-neutral-400 mb-6 flex items-center gap-2">
               <Music className="w-4 h-4" />
               Sonic Interpretation
             </h2>

             {blueprint ? (
               <div className="space-y-6 z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                 <div>
                   <div className="flex items-center gap-2 mb-2">
                    <p className="text-3xl font-display text-white leading-tight">
                      "{blueprint.emotional_tone}"
                    </p>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-900/50 border border-indigo-800 text-indigo-300 text-xs font-mono uppercase tracking-wider">
                      {selectedGenre}
                    </span>
                   </div>
                   <p className="text-neutral-400 text-lg italic font-light leading-relaxed">
                     {blueprint.scene_description}
                   </p>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-neutral-800/50 rounded-lg">
                      <span className="text-xs text-neutral-500 uppercase tracking-wider block mb-1">Tempo</span>
                      <span className="text-xl font-mono text-indigo-300">{blueprint.tempo_bpm} BPM</span>
                    </div>
                    <div className="p-3 bg-neutral-800/50 rounded-lg">
                      <span className="text-xs text-neutral-500 uppercase tracking-wider block mb-1">Palette</span>
                      <span className="text-sm font-mono text-indigo-300 uppercase">{blueprint.sonic_palette.replace('_', ' ')}</span>
                    </div>
                 </div>
                 
                 {/* Parameter Sliders (Read-only visualizers) */}
                 <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-neutral-500 w-16">Brightness</span>
                      <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400/80 rounded-full" style={{ width: `${blueprint.timbre_brightness * 100}%` }}></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-neutral-500 w-16">Density</span>
                      <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-400/80 rounded-full" style={{ width: `${blueprint.rhythm_density * 100}%` }}></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-neutral-500 w-16">Reverb</span>
                      <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400/80 rounded-full" style={{ width: `${blueprint.spatial_reverb * 100}%` }}></div>
                      </div>
                    </div>
                 </div>

               </div>
             ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-neutral-600 gap-3">
                 <ImageIcon className="w-8 h-8 opacity-20" />
                 <p className="text-sm">Upload an image to reveal its sound</p>
               </div>
             )}
          </div>

          {/* Player Controls & Visualizer */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-1 overflow-hidden relative">
            
            {/* Visualizer Canvas Container */}
            <div className="w-full h-32 bg-black rounded-xl overflow-hidden relative">
              <Visualizer 
                analyser={soundEngine.analyser} 
                isPlaying={state === AppState.PLAYING} 
              />
              {/* Playback Overlay */}
              {!blueprint && (
                 <div className="absolute inset-0 flex items-center justify-center text-neutral-700 font-mono text-xs uppercase tracking-widest">
                    Waveform Display
                 </div>
              )}
            </div>

            {/* Controls */}
            <div className="p-4 flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${state === AppState.PLAYING ? 'bg-green-500 animate-pulse' : 'bg-neutral-700'}`}></div>
                 <span className="text-xs font-mono text-neutral-400 uppercase">
                    {state === AppState.PLAYING ? 'Live Synthesis' : 'Standby'}
                 </span>
               </div>

               <div className="flex items-center gap-3">
                 {state === AppState.PLAYING ? (
                   <button 
                    onClick={handleStop}
                    className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full transition-colors"
                   >
                     <StopCircle className="w-6 h-6" />
                   </button>
                 ) : (
                   <button 
                    onClick={handleReplay}
                    disabled={!blueprint}
                    className="p-3 bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-600 rounded-full transition-colors"
                   >
                     <RefreshCw className="w-6 h-6" />
                   </button>
                 )}
               </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;
