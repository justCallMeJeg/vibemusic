import { listen } from '@tauri-apps/api/event';
import { playFile } from './audio';
import type { Track } from '../types/database';
import type { RepeatMode } from '../types/audio';

type QueueState = {
  queue: Track[];
  currentIndex: number;
  repeatMode: RepeatMode;
  isShuffled: boolean;
};

type QueueListener = (state: QueueState) => void;

class QueueService {
  private queue: Track[] = [];
  private originalQueue: Track[] = []; // Preserves order before shuffle
  private currentIndex: number = -1;
  private repeatMode: RepeatMode = 'off';
  private isShuffled: boolean = false;
  private listeners: Set<QueueListener> = new Set();

  constructor() {
    this.initListeners();
  }

  private async initListeners() {
    await listen('audio-playback-finished', () => {
      this.onPlaybackFinished();
    });
  }

  private async onPlaybackFinished() {
    console.log('[Queue] Playback finished, advancing...');
    if (this.repeatMode === 'one') {
      // Replay current
      await this.playCurrent();
    } else {
      // Auto-advance (true)
      await this.next(true);
    }
  }

  /**
   * Subscribe to queue state changes
   */
  public subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach(l => l(state));
  }

  public getState(): QueueState {
    return {
      queue: [...this.queue],
      currentIndex: this.currentIndex,
      repeatMode: this.repeatMode,
      isShuffled: this.isShuffled,
    };
  }

  /**
   * Play a specific track (replacing queue or just playing from existing?)
   * For now: Play a track from a list (e.g. clicking an album)
   */
  public async playTrackList(tracks: Track[], startIndex: number) {
    this.isShuffled = false;
    this.originalQueue = [...tracks];
    this.queue = [...tracks];
    this.currentIndex = startIndex;
    
    this.notify();
    await this.playCurrent();
  }

  /**
   * Add tracks to end of queue
   */
  public add(tracks: Track[]) {
    this.originalQueue.push(...tracks);
    this.queue.push(...tracks);
    this.notify();
  }

  /**
   * Play the current track at currentIndex
   */
  private async playCurrent() {
    if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
      const track = this.queue[this.currentIndex];
      await playFile(track.file_path);
    }
  }

  public async next(autoAdvance = false) {
    if (this.queue.length === 0) return;

    if (this.currentIndex < this.queue.length - 1) {
      this.currentIndex++;
      this.notify();
      await this.playCurrent();
    } else if (this.repeatMode === 'all' && autoAdvance) {
      // Loop back to start
      this.currentIndex = 0;
      this.notify();
      await this.playCurrent();
    } else {
      // End of queue
      if (!autoAdvance) {
        // User clicked next at end of queue -> maybe loop or do nothing?
        // Standard behavior: usually stop or loop if repeat all.
         if (this.repeatMode === 'all') {
            this.currentIndex = 0;
            this.notify();
            await this.playCurrent();
         }
      }
    }
  }

  public async previous() {
    if (this.queue.length === 0) return;

    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.notify();
      await this.playCurrent();
    } else {
      // At start, maybe restart track or go to end if repeat all?
      // Usually just restart track if > 3s, else go to prev.
      // For simplicity:
      await this.playCurrent(); // Restart
    }
  }

  public setRepeatMode(mode: RepeatMode) {
    this.repeatMode = mode;
    this.notify();
  }

  public toggleShuffle() {
    this.isShuffled = !this.isShuffled;
    
    if (this.isShuffled) {
      // Shuffle logic
      // We should keep the current playing track as current
      const currentTrack = this.currentIndex >= 0 ? this.queue[this.currentIndex] : null;
      
      this.originalQueue = [...this.queue]; // Store current order as original if not already (logic complex here if modified)
      // Actually originalQueue should always track the "logical" order (album/playlist order)
      // and queue is the "playback" order.
      
      // Simple shuffle:
      // Remove current track, shuffle rest, prepend current track
      const toShuffle = [...this.originalQueue];
      if (currentTrack) {
        const idx = toShuffle.findIndex(t => t.id === currentTrack.id);
        if (idx !== -1) toShuffle.splice(idx, 1);
      }
      
      // Fisher-Yates shuffle
      for (let i = toShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [toShuffle[i], toShuffle[j]] = [toShuffle[j], toShuffle[i]];
      }
      
      if (currentTrack) {
        toShuffle.unshift(currentTrack);
        this.currentIndex = 0;
      } else {
          this.currentIndex = -1;
      }
      
      this.queue = toShuffle;
      
    } else {
      // Restore original order
      // We need to find the current track in the original queue to set correct index
      const currentTrack = this.currentIndex >= 0 ? this.queue[this.currentIndex] : null;
      this.queue = [...this.originalQueue];
      
      if (currentTrack) {
        this.currentIndex = this.queue.findIndex(t => t.id === currentTrack.id);
      }
    }
    
    this.notify();
  }
}

export const queueService = new QueueService();
