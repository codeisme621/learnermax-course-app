'use client';

import { track } from '@vercel/analytics';
import MuxPlayer from '@mux/mux-player-react/lazy';

export function HeroVideo() {
  // Public Mux playback ID for the hero sales video (not a secret).
  // Unset → the video block is hidden rather than showing a dead player.
  const playbackId = process.env.NEXT_PUBLIC_HERO_VIDEO_PLAYBACK_ID;
  if (!playbackId) return null;

  return (
    <div className="relative mx-auto w-full max-w-4xl">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-emerald-300/20 to-cyan-300/5 blur-2xl" />
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-[#0b1714] shadow-2xl">
        <MuxPlayer
          playbackId={playbackId}
          streamType="on-demand"
          poster="/images/hero-video-poster.jpg"
          placeholder="/images/hero-video-poster.jpg"
          accentColor="#6ee7b7"
          metadata={{ video_title: 'Agentic Engineering: hero video' }}
          onPlay={() => track('hero_video_played')}
          onEnded={() => track('hero_video_completed')}
          style={{ width: '100%', height: '100%', aspectRatio: '16 / 9' }}
        />
      </div>
    </div>
  );
}
