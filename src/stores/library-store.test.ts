import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { useLibraryStore } from "./library-store";

const mockInvoke = vi.mocked(invoke);

beforeEach(() => {
  mockInvoke.mockReset();
  useLibraryStore.setState({
    tracks: [],
    albums: [],
    playlists: [],
    artists: [],
    isLoading: false,
    isInitialized: false,
  });
});

describe("library-store", () => {
  it("has correct initial state", () => {
    const s = useLibraryStore.getState();
    expect(s.tracks).toEqual([]);
    expect(s.albums).toEqual([]);
    expect(s.playlists).toEqual([]);
    expect(s.artists).toEqual([]);
    expect(s.isLoading).toBe(false);
    expect(s.isInitialized).toBe(false);
  });

  it("resetLibrary clears all data", () => {
    useLibraryStore.setState({
      tracks: [{ id: 1, title: "Song", artist: "A", album: "B", album_id: 1, artist_id: 1, artist_names: ["A"], artist_ids: [1], artist_roles: ["main"], duration_ms: 200000, file_path: "/a.mp3", artwork_path: null, track_number: 1 }],
      albums: [{ id: 1, title: "Album", artist_name: "A", artist_names: [], album_artist_names: [], artist_id: 1, artwork_path: null, year: 2024, track_count: 1, total_duration_ms: 200000 }],
      playlists: [{ id: 1, name: "P", description: null, artwork_path: null, track_count: 1, created_at: "now" }],
      artists: [{ id: 1, name: "A", album_count: 1, track_count: 1, artwork_path: null }],
      isInitialized: true,
    });
    useLibraryStore.getState().resetLibrary();
    const s = useLibraryStore.getState();
    expect(s.tracks).toEqual([]);
    expect(s.albums).toEqual([]);
    expect(s.playlists).toEqual([]);
    expect(s.artists).toEqual([]);
    expect(s.isInitialized).toBe(false);
    expect(s.isLoading).toBe(false);
  });

  it("resetLibrary can set loading", () => {
    useLibraryStore.getState().resetLibrary(true);
    expect(useLibraryStore.getState().isLoading).toBe(true);
  });

  it("fetchLibrary calls invoke for all four collections", async () => {
    mockInvoke.mockResolvedValue([]);
    await useLibraryStore.getState().fetchLibrary();
    expect(mockInvoke).toHaveBeenCalledWith("get_all_tracks");
    expect(mockInvoke).toHaveBeenCalledWith("get_all_albums");
    expect(mockInvoke).toHaveBeenCalledWith("get_all_artists");
    expect(mockInvoke).toHaveBeenCalledWith("get_playlists");
    expect(useLibraryStore.getState().isInitialized).toBe(true);
    expect(useLibraryStore.getState().isLoading).toBe(false);
  });

  it("fetchLibrary sets error state on failure", async () => {
    mockInvoke.mockRejectedValue(new Error("network error"));
    await useLibraryStore.getState().fetchLibrary();
    expect(useLibraryStore.getState().isLoading).toBe(false);
  });
});
