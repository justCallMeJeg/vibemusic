/**
 * Scanner Service for VibMusic
 * 
 * Provides music file scanning and indexing functionality:
 * - Folder selection dialogs
 * - Recursive audio file discovery
 * - Metadata extraction using lofty-rs
 * - Database indexing with progress events
 * 
 * @module scanner
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import type { TrackMetadata, ScanProgress, ScanResult } from '../types/scanner';
import { upsertTrack, getAllTrackPaths, deleteTrackByFilePath } from './database';

/**
 * Open a native folder picker dialog to select a music folder.
 * 
 * @returns The selected folder path, or null if the user cancelled
 * 
 * @example
 * ```typescript
 * const folder = await selectMusicFolder();
 * if (folder) {
 *   console.log(`Selected: ${folder}`);
 *   await scanAndIndexLibrary([folder]);
 * }
 * ```
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
 * Scan a directory for audio files (recursive).
 * 
 * Supported formats: MP3, FLAC, WAV, OGG, M4A, AAC, AIFF, WavPack, Opus
 * 
 * @param path - Absolute path to the directory to scan
 * @returns Array of absolute file paths for found audio files
 * @throws Error if the path doesn't exist or isn't a directory
 * 
 * @example
 * ```typescript
 * const files = await scanFolder('C:/Music');
 * console.log(`Found ${files.length} audio files`);
 * ```
 */
export async function scanFolder(path: string): Promise<string[]> {
  return invoke<string[]>('scan_folder', { path });
}

/**
 * Extract metadata from a single audio file.
 * 
 * Uses lofty-rs to read ID3/Vorbis/etc. tags and audio properties.
 * 
 * @param path - Absolute path to the audio file
 * @returns TrackMetadata object with extracted information
 * @throws Error if the file doesn't exist or can't be read
 * 
 * @example
 * ```typescript
 * const metadata = await getFileMetadata('/path/to/song.mp3');
 * console.log(`${metadata.title} by ${metadata.artist}`);
 * ```
 */
export async function getFileMetadata(path: string): Promise<TrackMetadata> {
  return invoke<TrackMetadata>('get_file_metadata', { path });
}

/**
 * Scan multiple folders and extract metadata for all audio files.
 * 
 * This is a lower-level function that only scans and extracts metadata.
 * Use `scanAndIndexLibrary` to also save results to the database.
 * 
 * Emits 'scan-progress' events during scanning.
 * 
 * @param folders - Array of folder paths to scan
 * @returns ScanResult with tracks, errors, and counts
 */
export async function scanMusicLibrary(folders: string[]): Promise<ScanResult> {
  return invoke<ScanResult>('scan_music_library', { folders });
}

/**
 * Subscribe to scan progress events.
 * 
 * Progress events are emitted during `scanMusicLibrary` and `scanAndIndexLibrary`.
 * 
 * @param callback - Function called for each progress update
 * @returns Unlisten function to stop receiving events
 * 
 * @example
 * ```typescript
 * const unlisten = await onScanProgress((progress) => {
 *   console.log(`${progress.current}/${progress.total}: ${progress.current_file}`);
 * });
 * 
 * // When done:
 * unlisten();
 * ```
 */
export async function onScanProgress(
  callback: (progress: ScanProgress) => void
): Promise<UnlistenFn> {
  return listen<ScanProgress>('scan-progress', (event) => {
    callback(event.payload);
  });
}

/**
 * Scan folders and index all found tracks into the database.
 * 
 * This is the main function for library import. It:
 * 1. Recursively scans all provided folders for audio files
 * 2. Extracts metadata using lofty-rs
 * 3. Upserts each track into the SQLite database
 * 
 * Existing tracks (same file_path) are updated with new metadata.
 * 
 * @param folders - Array of folder paths to scan
 * @param onProgress - Optional callback for progress updates
 * @returns Summary with counts of indexed, updated, and errored tracks
 * 
 * @example
 * ```typescript
 * const result = await scanAndIndexLibrary(
 *   ['C:/Music', 'D:/Downloads/Music'],
 *   (progress) => {
 *     setProgress(`${progress.current}/${progress.total}`);
 *   }
 * );
 * 
 * console.log(`Added ${result.indexed}, updated ${result.updated}`);
 * ```
 */
export async function scanAndIndexLibrary(
  folders: string[],
  onProgress?: (progress: ScanProgress) => void
): Promise<{
  indexed: number;
  updated: number;
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
    let updated = 0;
    let errors = 0;

    // Index each track into the database
    for (const track of result.tracks) {
      try {
        const { isNew } = await upsertTrack({
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

        if (isNew) {
          indexed++;
        } else {
          updated++;
        }
      } catch (error) {
        errors++;
        console.error(`Failed to index ${track.file_path}:`, error);
      }
    }

    return { indexed, updated, errors };
  } finally {
    // Clean up listener
    if (unlisten) {
      unlisten();
    }
  }
}

/**
 * Quickly count audio files in folders without extracting metadata.
 * 
 * Useful for showing a preview of how many files will be scanned.
 * 
 * @param folders - Array of folder paths to count files in
 * @returns Total number of audio files found
 * 
 * @example
 * ```typescript
 * const count = await countAudioFiles(['C:/Music']);
 * console.log(`Found ${count} files to scan`);
 * ```
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

/**
 * Check if files exist at the given paths.
 * @param paths Array of absolute file paths
 * @returns Array of paths that do not exist
 */
export async function checkFilesExist(paths: string[]): Promise<string[]> {
  return invoke<string[]>('check_files_exist', { paths });
}

/**
 * Synchronize the library by removing tracks that no longer exist on disk.
 * 
 * @returns Object containing the number of removed tracks
 */
export async function syncLibrary(): Promise<{ removed: number }> {
  // Get all track paths from database
  const tracks = await getAllTrackPaths();
  const paths = tracks.map(t => t.file_path);
  
  // Check existence in chunks to be safe with IPC
  const missingPaths: string[] = [];
  const chunkSize = 500;
  
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const missing = await checkFilesExist(chunk);
    missingPaths.push(...missing);
  }
  
  // Remove missing tracks from database
  for (const path of missingPaths) {
    await deleteTrackByFilePath(path);
  }
  
  return { removed: missingPaths.length };
}

