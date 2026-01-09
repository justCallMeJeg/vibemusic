import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { PlaybackState } from '../types/audio';

const EVENT_PLAYBACK_STATE = 'audio-playback-state';
const EVENT_PLAYBACK_PROGRESS = 'audio-playback-progress';

export async function playFile(path: string): Promise<void> {
  await invoke('audio_play', { path });
}

export async function pause(): Promise<void> {
  await invoke('audio_pause');
}

export async function resume(): Promise<void> {
  await invoke('audio_resume');
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
