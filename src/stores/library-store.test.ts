import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { useContentStore } from "@features/library/store/content-store";

const mockInvoke = vi.mocked(invoke);

beforeEach(() => {
  mockInvoke.mockReset();
  useContentStore.setState({
    tracks: [],
    albums: [],
    artists: [],
    isLoading: false,
    isInitialized: false,
  });
});

describe("content-store", () => {
  it("has correct initial state", () => {
    const s = useContentStore.getState();
    expect(s.tracks).toEqual([]);
    expect(s.albums).toEqual([]);
    expect(s.artists).toEqual([]);
    expect(s.isLoading).toBe(false);
    expect(s.isInitialized).toBe(false);
  });

  it("resetContent clears all data", () => {
    useContentStore.setState({
      tracks: [{ id: 1, title: "Song", artist: "A", album: "B", album_id: 1, artist_id: 1, artist_names: ["A"], artist_ids: [1], artist_roles: ["main"], duration_ms: 200000, file_path: "/a.mp3", artwork_path: null, track_number: 1 }],
      albums: [{ id: 1, title: "Album", artist_name: "A", artist_names: [], album_artist_names: [], artist_id: 1, artwork_path: null, year: 2024, track_count: 1, total_duration_ms: 200000 }],
      artists: [{ id: 1, name: "A", album_count: 1, track_count: 1, artwork_path: null }],
      isInitialized: true,
    });
    useContentStore.getState().resetContent();
    const s = useContentStore.getState();
    expect(s.tracks).toEqual([]);
    expect(s.albums).toEqual([]);
    expect(s.artists).toEqual([]);
    expect(s.isInitialized).toBe(false);
    expect(s.isLoading).toBe(false);
  });

  it("resetContent can set loading", () => {
    useContentStore.getState().resetContent(true);
    expect(useContentStore.getState().isLoading).toBe(true);
  });

  it("fetchContent calls invoke for all three collections", async () => {
    mockInvoke.mockResolvedValue([]);
    await useContentStore.getState().fetchContent();
    expect(mockInvoke).toHaveBeenCalledWith("get_all_tracks");
    expect(mockInvoke).toHaveBeenCalledWith("get_all_albums");
    expect(mockInvoke).toHaveBeenCalledWith("get_all_artists");
    expect(useContentStore.getState().isInitialized).toBe(true);
    expect(useContentStore.getState().isLoading).toBe(false);
  });

  it("fetchContent sets error state on failure", async () => {
    mockInvoke.mockRejectedValue(new Error("network error"));
    await useContentStore.getState().fetchContent();
    expect(useContentStore.getState().isLoading).toBe(false);
  });
});
