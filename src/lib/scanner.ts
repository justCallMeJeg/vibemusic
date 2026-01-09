/**
 * Scanner Service
 * Frontend service for music file scanning operations
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import type { TrackMetadata, ScanProgress, ScanResult } from '../types/scanner';
import { addTrack } from './database';

/**
 * Open a folder picker dialog to select a music folder
 */
export async function selectMusicFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: 'Select Music Folder',
  });

  // Returns null if cancelled, or a path string
  if (typeof selected === 'string') {
    return selected;
  }

  return null;
}

/**
 * Get all audio file paths in a directory
 */
export async function scanFolder(path: string): Promise<string[]> {
  return invoke<string[]>('scan_folder', { path });
}

/**
 * Get metadata for a single audio file
 */
export async function getFileMetadata(path: string): Promise<TrackMetadata> {
  return invoke<TrackMetadata>('get_file_metadata', { path });
}

/**
 * Scan multiple folders and extract metadata for all audio files
 */
export async function scanMusicLibrary(folders: string[]): Promise<ScanResult> {
  return invoke<ScanResult>('scan_music_library', { folders });
}

/**
 * Listen to scan progress events
 * Returns an unlisten function to stop listening
 */
export async function onScanProgress(
  callback: (progress: ScanProgress) => void
): Promise<UnlistenFn> {
  return listen<ScanProgress>('scan-progress', (event) => {
    callback(event.payload);
  });
}

/**
 * Scan folders and index all tracks into the database
 * Returns summary of what was indexed
 */
export async function scanAndIndexLibrary(
  folders: string[],
  onProgress?: (progress: ScanProgress) => void
): Promise<{
  indexed: number;
  skipped: number;
  errors: number;
}> {
  let unlisten: UnlistenFn | null = null;

  // Set up progress listener if callback provided
  if (onProgress) {
    unlisten = await onScanProgress(onProgress);
  }

  try {
    // Scan all folders
    const result = await scanMusicLibrary(folders);

    let indexed = 0;
    let skipped = 0;
    let errors = 0;

    // Index each track into the database
    for (const track of result.tracks) {
      try {
        await addTrack({
          title: track.title || track.file_name,
          artist_name: track.artist || undefined,
          album_title: track.album || undefined,
          album_artist: track.album_artist || undefined,
          track_number: track.track_number || undefined,
          disc_number: track.disc_number || undefined,
          duration_ms: track.duration_ms,
          file_path: track.file_path,
          file_size: track.file_size,
          file_format: track.file_format,
          sample_rate: track.sample_rate || undefined,
          bit_rate: track.bit_rate || undefined,
          channels: track.channels || undefined,
          genre: track.genre || undefined,
          year: track.year || undefined,
        });
        indexed++;
      } catch (error) {
        // Track might already exist (duplicate file path)
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('UNIQUE constraint')) {
          skipped++;
        } else {
          errors++;
          console.error(`Failed to index ${track.file_path}:`, error);
        }
      }
    }

    return { indexed, skipped, errors };
  } finally {
    // Clean up listener
    if (unlisten) {
      unlisten();
    }
  }
}

/**
 * Quick scan to count audio files in folders
 */
export async function countAudioFiles(folders: string[]): Promise<number> {
  let total = 0;

  for (const folder of folders) {
    try {
      const files = await scanFolder(folder);
      total += files.length;
    } catch {
      // Ignore errors for individual folders
    }
  }

  return total;
}
