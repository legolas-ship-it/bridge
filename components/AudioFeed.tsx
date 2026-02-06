
import React, { useState, useEffect, useRef } from 'react';
import { TopicData } from '../types';
import { Headphones, Play, Pause, SkipForward, SkipBack, X } from 'lucide-react';

interface AudioFeedProps {
  topics: TopicData[];
}

const AudioFeed: React.FC<AudioFeedProps> = ({ topics }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isHovered, setIsHovered] = useState(false);
  const [hasStarted, setHasStarted] = useState(false); // To track if user has interacted
  
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize SpeechSynthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Generate the "Podcast" script for a topic
  const generateScript = (topic: TopicData) => {
    // Structure: Title -> Summary (Background) -> Tension -> Why (Hook)
    const tensionPart = topic.coreTension 
      ? `The core tension here is ${topic.coreTension}.` 
      : "This involves complex trade-offs.";
    
    // Clean up text for speech (remove newlines, extra spaces)
    const cleanWhy = topic.whyMatters.replace(/\n/g, ' ').replace(/"/g, '');
    
    return `Next topic: ${topic.title}. ${topic.summary} ${tensionPart} Why it matters: ${cleanWhy}`;
  };

  const playTopic = (index: number) => {
    if (!synthRef.current || !topics[index]) return;

    // Cancel existing
    synthRef.current.cancel();

    const script = generateScript(topics[index]);
    const utterance = new SpeechSynthesisUtterance(script);
    
    // Attempt to pick a decent voice (prefer Google US English or similar)
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English')) || voices.find(v => v.lang === 'en-US');
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.rate = playbackRate;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      // Auto play next
      if (index < topics.length - 1) {
        setCurrentIndex(index + 1);
        playTopic(index + 1);
      } else {
        setIsPlaying(false);
        setHasStarted(false);
      }
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
    setIsPlaying(true);
    setHasStarted(true);
  };

  const togglePlay = () => {
    if (!synthRef.current) return;

    if (isPlaying) {
      synthRef.current.pause();
      setIsPlaying(false);
    } else {
      if (synthRef.current.paused && hasStarted) {
        synthRef.current.resume();
        setIsPlaying(true);
      } else {
        playTopic(currentIndex);
      }
    }
  };

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % topics.length;
    setCurrentIndex(nextIndex);
    playTopic(nextIndex);
  };

  const handlePrev = () => {
    const prevIndex = (currentIndex - 1 + topics.length) % topics.length;
    setCurrentIndex(prevIndex);
    playTopic(prevIndex);
  };

  const changeSpeed = () => {
    const rates = [0.75, 1.0, 1.5, 2.0];
    const nextRateIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const newRate = rates[nextRateIdx];
    setPlaybackRate(newRate);
    
    // If playing, apply speed immediately to current utterance if possible, 
    // but WebSpeech API often requires restarting the utterance to change rate reliably.
    // For smoothness, we'll just update state for the *next* play or re-trigger if user wants.
    // To instantly apply, we'd have to cancel and seek, which is hard with TTS. 
    // We will simple restart current track to apply speed.
    if (isPlaying) {
        // Small delay to allow state update
        setTimeout(() => playTopic(currentIndex), 50);
    }
  };

  return (
    <div 
      className="relative flex items-center z-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Container: Expands on hover */}
      <div 
        className={`
          flex items-center bg-white border border-slate-200 rounded-full shadow-sm transition-all duration-500 ease-out overflow-hidden
          ${isHovered || isPlaying ? 'w-[280px] pr-4' : 'w-10 border-transparent shadow-none bg-transparent'}
        `}
      >
        {/* Icon (Always visible anchor) */}
        <div className={`
            w-10 h-10 flex items-center justify-center shrink-0 cursor-pointer transition-colors
            ${isPlaying ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}
        `}>
           {isPlaying ? (
             <div className="flex gap-0.5 items-end h-3">
               <span className="w-0.5 h-3 bg-blue-500 animate-[bounce_1s_infinite]"></span>
               <span className="w-0.5 h-2 bg-blue-500 animate-[bounce_1.2s_infinite]"></span>
               <span className="w-0.5 h-3 bg-blue-500 animate-[bounce_0.8s_infinite]"></span>
             </div>
           ) : (
             <Headphones size={20} />
           )}
        </div>

        {/* Controls (Reveal on hover) */}
        <div className={`flex items-center gap-3 ml-1 ${(isHovered || isPlaying) ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
           
           <div className="flex items-center gap-1">
             <button onClick={handlePrev} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500">
               <SkipBack size={14} className="fill-slate-500" />
             </button>
             
             <button 
               onClick={togglePlay} 
               className="w-8 h-8 bg-slate-900 hover:bg-slate-800 text-white rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95"
             >
               {isPlaying ? <Pause size={14} className="fill-white" /> : <Play size={14} className="fill-white ml-0.5" />}
             </button>

             <button onClick={handleNext} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500">
               <SkipForward size={14} className="fill-slate-500" />
             </button>
           </div>

           <div className="h-4 w-px bg-slate-200"></div>

           <button 
             onClick={changeSpeed}
             className="text-[10px] font-bold text-slate-500 hover:text-blue-600 w-8 text-center"
             title="Playback Speed"
           >
             {playbackRate}x
           </button>
           
           {/* Current Track Indicator (Tiny) */}
           <span className="text-[9px] text-slate-300 font-mono">
             {currentIndex + 1}/{topics.length}
           </span>

        </div>
      </div>
      
      {/* Tooltip for the collapsed state (only when NOT hovered and NOT playing) */}
      {!isHovered && !isPlaying && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-[10px] bg-slate-800 text-white px-2 py-1 rounded whitespace-nowrap">
          Audio Digest
        </div>
      )}
    </div>
  );
};

export default AudioFeed;
