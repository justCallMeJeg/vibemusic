import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { PlaybackState } from '../types/audio';
import { errorService } from './error';

const EVENT_PLAYBACK_STATE = 'audio-playback-state';
const EVENT_PLAYBACK_PROGRESS = 'audio-playback-progress';

export interface PlayOptions {
  path: string;
  title?: string;
  artist?: string;
  album?: string;
  cover?: string;
}

export async function playFile(options: PlayOptions | string): Promise<void> {
  try {
    if (typeof options === 'string') {
      await invoke('audio_play', { path: options, title: null, artist: null, album: null, _cover: null });
    } else {
      await invoke('audio_play', { 
        path: options.path,
        title: options.title || null,
        artist: options.artist || null,
        album: options.album || null,
        _cover: options.cover || null
      });
    }
  } catch (err) {
    errorService.notify(err, 'Failed to play file');
  }
}

export async function pause(): Promise<void> {
  try {
    await invoke('audio_pause');
  } catch (err) {
    errorService.notify(err, 'Failed to pause playback');
  }
}

export async function resume(): Promise<void> {
  try {
    await invoke('audio_resume');
  } catch (err) {
    errorService.notify(err, 'Failed to resume playback');
  }
}

export async function stop(): Promise<void> {
  await invoke('audio_stop');
}

export async function seek(positionMs: number): Promise<void> {
  await invoke('audio_seek', { positionMs });
}

export async function setVolume(volume: number): Promise<void> {
  await invoke('audio_set_volume', { volume: Math.max(0, Math.min(1.0, volume)) });
}

export async function getPlaybackState(): Promise<PlaybackState> {
  return invoke<PlaybackState>('audio_get_state');
}

export async function onPlaybackState(
  callback: (state: PlaybackState) => void
): Promise<UnlistenFn> {
  return listen<PlaybackState>(EVENT_PLAYBACK_STATE, (event) => {
    callback(event.payload);
  });
}

export async function onPlaybackProgress(
  callback: (state: PlaybackState) => void
): Promise<UnlistenFn> {
  return listen<PlaybackState>(EVENT_PLAYBACK_PROGRESS, (event) => {
    callback(event.payload);
  });
}
