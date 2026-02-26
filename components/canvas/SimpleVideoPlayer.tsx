
import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';

interface SimpleVideoPlayerProps { 
    src: string; 
    audioSrc?: string; 
    className?: string; 
    autoPlay?: boolean;
    onEnded?: () => void;
}

export const SimpleVideoPlayer: React.FC<SimpleVideoPlayerProps> = ({ src, audioSrc, className, autoPlay = false, onEnded }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        if(autoPlay && videoRef.current) {
            videoRef.current.play()
                .then(() => {
                    if (audioRef.current && audioSrc) audioRef.current.play();
                })
                .catch(() => setIsPlaying(false));
        }
    }, [src, audioSrc, autoPlay]);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
            if(audioRef.current) audioRef.current.pause();
        } else {
            videoRef.current.play();
            if(audioRef.current) audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!videoRef.current) return;
        videoRef.current.muted = !isMuted;
        if (audioRef.current) audioRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const curr = videoRef.current.currentTime;
        const dur = videoRef.current.duration;
        setCurrentTime(curr);
        if (dur > 0) setProgress((curr / dur) * 100);
        
        if (audioRef.current && Math.abs(audioRef.current.currentTime - curr) > 0.3) {
            audioRef.current.currentTime = curr;
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (!videoRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        const newTime = (x / width) * videoRef.current.duration;
        videoRef.current.currentTime = newTime;
        if (audioRef.current) audioRef.current.currentTime = newTime;
    };

    const requestFullscreen = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            if (videoRef.current.requestFullscreen) videoRef.current.requestFullscreen();
            // @ts-ignore
            else if (videoRef.current.webkitRequestFullscreen) videoRef.current.webkitRequestFullscreen();
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <div 
            className={`relative group bg-transparent overflow-hidden ${className}`}
            onMouseDown={(e) => e.stopPropagation()} // Prevent node selection/drag when interacting with player
            onTouchStart={(e) => e.stopPropagation()}
        >
            <video 
                ref={videoRef}
                src={src}
                className="w-full h-full object-cover"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => {
                    setIsPlaying(false);
                    if (onEnded) onEnded();
                }}
                onClick={togglePlay}
                muted={!!audioSrc || isMuted} 
            />
            {audioSrc && (
                <audio ref={audioRef} src={audioSrc} muted={isMuted} />
            )}
            {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div 
                        className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-lg hover:scale-110 transition-transform cursor-pointer pointer-events-auto"
                        onClick={togglePlay}
                    >
                        <Play size={24} fill="currentColor" className="ml-1"/>
                    </div>
                </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-2 z-20">
                <div className="w-full h-1 bg-white/20 rounded-full cursor-pointer relative group/progress" onClick={handleSeek}>
                    <div className="h-full bg-white rounded-full relative" style={{ width: `${progress}%` }}>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 shadow-sm transform scale-125"></div>
                    </div>
                </div>
                <div className="flex items-center justify-between text-white/90">
                    <div className="flex items-center gap-3">
                        <button onClick={togglePlay} className="hover:text-white transition-colors">
                            {isPlaying ? <Pause size={14} fill="currentColor"/> : <Play size={14} fill="currentColor"/>}
                        </button>
                        <span className="text-[10px] font-medium tracking-wide opacity-80 select-none">{formatTime(currentTime)} / {formatTime(duration)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={toggleMute} className="hover:text-white">{isMuted ? <VolumeX size={14}/> : <Volume2 size={14}/>}</button>
                        <button onClick={requestFullscreen} className="hover:text-white"><Maximize2 size={14}/></button>
                    </div>
                </div>
            </div>
        </div>
    );
};
