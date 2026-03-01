"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

interface VoiceMessageProps {
    audioUrl: string;
    isMe: boolean;
}

const VoiceMessage = ({ audioUrl, isMe }: VoiceMessageProps) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [waveform, setWaveform] = useState<number[]>([]);

    // Generate a pseudo-random waveform based on the URL so it's consistent for the same message
    useEffect(() => {
        const seed = audioUrl.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const pseudoRandom = (s: number) => {
             const x = Math.sin(s) * 10000;
             return x - Math.floor(x);
        };
        
        const bars = Array.from({ length: 24 }, (_, i) => {
            return 20 + pseudoRandom(seed + i) * 80;
        });
        setWaveform(bars);
    }, [audioUrl]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const togglePlaybackRate = () => {
        const rates = [1, 1.5, 2];
        const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
        setPlaybackRate(nextRate);
        if (audioRef.current) {
            audioRef.current.playbackRate = nextRate;
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className={`flex flex-col gap-1 min-w-[240px] ${isMe ? "bg-transparent" : "bg-transparent"}`}>
            <audio 
                ref={audioRef} 
                src={audioUrl} 
                onTimeUpdate={handleTimeUpdate} 
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
            />
            
            <div className="flex items-center gap-3">
                <button 
                    onClick={togglePlay}
                    className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-md
                        ${isMe ? "bg-white/20 hover:bg-white/30" : "bg-blue-600 hover:bg-blue-700 text-white"}
                    `}
                >
                    {isPlaying ? (
                        <div className="flex gap-1 items-center justify-center">
                            <div className="w-1.5 h-4 bg-current rounded-full animate-pulse" />
                            <div className="w-1.5 h-4 bg-current rounded-full animate-pulse" />
                        </div>
                    ) : (
                        <Image 
                            src="/play-large-fill.svg" 
                            alt="Play" 
                            width={16} 
                            height={16} 
                            className={`${isMe ? "brightness-0 invert" : "brightness-0 invert"}`} 
                        />
                    )}
                </button>

                <div className="flex-1 flex flex-col gap-1.5 pt-1">
                    <div className="flex items-end gap-[3px] h-8 relative">
                        {waveform.map((height, i) => {
                            const isPlayed = (i / waveform.length) * 100 < progress;
                            return (
                                <div 
                                    key={i} 
                                    className={`w-[3px] rounded-full transition-all duration-300 ${
                                        isPlayed 
                                            ? (isMe ? "bg-white" : "bg-blue-600") 
                                            : (isMe ? "bg-white/30" : "bg-gray-200 dark:bg-gray-700")
                                    }`}
                                    style={{ height: `${height}%` }}
                                />
                            );
                        })}
                        {/* Interactive overlay (UX improvement) */}
                        <div className="absolute inset-0 cursor-pointer opacity-0" />
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                    <button 
                        onClick={togglePlaybackRate}
                        className={`
                            text-[10px] font-black px-1.5 py-0.5 rounded-md transition-all
                            ${isMe ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}
                            hover:scale-110
                        `}
                    >
                        {playbackRate}x
                    </button>
                    <span className={`text-[10px] font-bold opacity-70 ${isMe ? "text-white" : "text-gray-500"}`}>
                        {formatTime(currentTime || duration)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default VoiceMessage;
