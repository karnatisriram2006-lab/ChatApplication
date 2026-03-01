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

    useEffect(() => {
        const seed = audioUrl.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const pseudoRandom = (s: number) => {
             const x = Math.sin(s) * 10000;
             return x - Math.floor(x);
        };
        
        const bars = Array.from({ length: 24 }, (_, i) => {
            return 25 + pseudoRandom(seed + i) * 75;
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
        if (isNaN(time) || time === Infinity) return "0:00";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className={`flex flex-col gap-1.5 min-w-[200px] sm:min-w-[240px]`}>
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
                        w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-lg
                        ${isMe ? "bg-white/15 hover:bg-white/20 text-white" : "bg-primary hover:bg-primary-hover text-white shadow-primary/20"}
                    `}
                >
                    {isPlaying ? (
                        <div className="flex gap-1 items-center justify-center">
                            <div className="w-1.5 h-4 bg-current rounded-full animate-pulse-soft" />
                            <div className="w-1.5 h-4 bg-current rounded-full animate-pulse-soft" />
                        </div>
                    ) : (
                        <Image src="/play-large-fill.svg" alt="Play" width={16} height={16} className="invert" />
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
                                            ? (isMe ? "bg-white" : "bg-accent shadow-[0_0_8px_rgba(34,211,238,0.5)]") 
                                            : (isMe ? "bg-white/20" : "bg-border/60 dark:bg-white/10")
                                    }`}
                                    style={{ height: `${height}%` }}
                                />
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                    <button 
                        onClick={togglePlaybackRate}
                        className={`
                            text-[10px] font-black px-1.5 py-0.5 rounded-lg transition-all
                            ${isMe ? "bg-white/10 text-white/90" : "bg-input-surface text-text-muted"}
                            hover:scale-110 active:scale-90
                        `}
                    >
                        {playbackRate}x
                    </button>
                    <span className={`text-[10px] font-bold opacity-70 ${isMe ? "text-white/90" : "text-text-muted"}`}>
                        {formatTime(currentTime || duration)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default VoiceMessage;
