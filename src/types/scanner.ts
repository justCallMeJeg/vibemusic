/**
 * Scanner Types
 * Type definitions for the music file scanner
 */

/**
 * Metadata extracted from an audio file
 */
export interface TrackMetadata {
  file_path: string;
  file_name: string;
  file_size: number;
  file_format: string;
  title: string | null;
  artist: string | null;
  artists: string[];
  album: string | null;
  album_artist: string | null;
  track_number: number | null;
  disc_number: number | null;
  year: number | null;
  genre: string | null;
  duration_ms: number;
  sample_rate: number | null;
  bit_rate: number | null;
  channels: number | null;
}

/**
 * Progress event emitted during scanning
 */
export interface ScanProgress {
  current: number;
  total: number;
  current_file: string;
  status: 'scanning' | 'complete' | 'error';
}

/**
 * Result of a folder scan operation
 */
export interface ScanResult {
  scanned_count: number;
  success_count: number;
  error_count: number;
  tracks: TrackMetadata[];
  errors: string[];
}
