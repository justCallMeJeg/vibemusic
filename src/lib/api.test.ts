import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  getTracks,
  getAlbums,
  getArtists,
  getArtistById,
  getArtistAlbums,
  getArtistTracks,
  getAlbumById,
  getAlbumTracks,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  getPlaylists,
  getPlaylistTracks,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  reorderPlaylist,
  search,
  probeFile,
  getLyrics,
} from "./api";
import type { Track, Artist, Playlist, SearchResults } from "./api";

const mockInvoke = vi.mocked(invoke);

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("getTracks", () => {
  it("calls invoke with correct command", async () => {
    const tracks: Track[] = [
      {
        id: 1,
        title: "Test",
        artist: "Artist",
        artist_id: 1,
        artist_names: ["Artist"],
        artist_ids: [1],
        artist_roles: ["main"],
        album: "Album",
        album_id: 1,
        duration_ms: 200000,
        file_path: "/music/test.mp3",
        artwork_path: null,
        track_number: 1,
      },
    ];
    mockInvoke.mockResolvedValue(tracks);
    const result = await getTracks();
    expect(mockInvoke).toHaveBeenCalledWith("get_all_tracks");
    expect(result).toEqual(tracks);
  });
});

describe("getAlbums", () => {
  it("calls invoke with correct command", async () => {
    mockInvoke.mockResolvedValue([]);
    await getAlbums();
    expect(mockInvoke).toHaveBeenCalledWith("get_all_albums");
  });
});

describe("getArtists", () => {
  it("calls invoke with correct command", async () => {
    mockInvoke.mockResolvedValue([]);
    await getArtists();
    expect(mockInvoke).toHaveBeenCalledWith("get_all_artists");
  });
});

describe("getArtistById", () => {
  it("calls invoke with id argument", async () => {
    mockInvoke.mockResolvedValue(null);
    const result = await getArtistById(5);
    expect(mockInvoke).toHaveBeenCalledWith("get_artist_by_id", { id: 5 });
    expect(result).toBeNull();
  });

  it("returns an artist object", async () => {
    const artist: Artist = {
      id: 5,
      name: "Test Artist",
      album_count: 2,
      track_count: 10,
      artwork_path: null,
    };
    mockInvoke.mockResolvedValue(artist);
    const result = await getArtistById(5);
    expect(result).toEqual(artist);
  });
});

describe("getArtistAlbums", () => {
  it("calls invoke with id", async () => {
    mockInvoke.mockResolvedValue([]);
    await getArtistAlbums(3);
    expect(mockInvoke).toHaveBeenCalledWith("get_artist_albums", { id: 3 });
  });
});

describe("getArtistTracks", () => {
  it("calls invoke with id", async () => {
    mockInvoke.mockResolvedValue([]);
    await getArtistTracks(3);
    expect(mockInvoke).toHaveBeenCalledWith("get_artist_tracks", { id: 3 });
  });
});

describe("getAlbumById", () => {
  it("calls invoke with id", async () => {
    mockInvoke.mockResolvedValue(null);
    await getAlbumById(10);
    expect(mockInvoke).toHaveBeenCalledWith("get_album_by_id", { id: 10 });
  });
});

describe("getAlbumTracks", () => {
  it("calls invoke with albumId", async () => {
    mockInvoke.mockResolvedValue([]);
    await getAlbumTracks(10);
    expect(mockInvoke).toHaveBeenCalledWith("get_album_tracks", { albumId: 10 });
  });
});

describe("createPlaylist", () => {
  it("calls invoke with name and description", async () => {
    const playlist: Playlist = {
      id: 1,
      name: "My Playlist",
      description: "A test playlist",
      artwork_path: null,
      track_count: 0,
      created_at: "2024-01-01",
      is_liked: false,
      is_system: false,
      pinned: false,
      pinned_at: null,
    };
    mockInvoke.mockResolvedValue(playlist);
    const result = await createPlaylist("My Playlist", "A test playlist");
    expect(mockInvoke).toHaveBeenCalledWith("create_playlist", {
      name: "My Playlist",
      description: "A test playlist",
    });
    expect(result).toEqual(playlist);
  });

  it("works without description", async () => {
    mockInvoke.mockResolvedValue({
      id: 2,
      name: "Empty",
      description: null,
      artwork_path: null,
      track_count: 0,
      created_at: "2024-01-01",
    });
    await createPlaylist("Empty");
    expect(mockInvoke).toHaveBeenCalledWith("create_playlist", {
      name: "Empty",
      description: undefined,
    });
  });
});

describe("updatePlaylist", () => {
  it("calls invoke with all arguments", async () => {
    mockInvoke.mockResolvedValue(undefined);
    await updatePlaylist(1, "New Name", "New Desc", "/path/art.jpg");
    expect(mockInvoke).toHaveBeenCalledWith("update_playlist", {
      id: 1,
      name: "New Name",
      description: "New Desc",
      artworkPath: "/path/art.jpg",
    });
  });
});

describe("deletePlaylist", () => {
  it("calls invoke with id", async () => {
    mockInvoke.mockResolvedValue(undefined);
    await deletePlaylist(5);
    expect(mockInvoke).toHaveBeenCalledWith("delete_playlist", { id: 5 });
  });
});

describe("getPlaylists", () => {
  it("calls invoke", async () => {
    mockInvoke.mockResolvedValue([]);
    await getPlaylists();
    expect(mockInvoke).toHaveBeenCalledWith("get_playlists");
  });
});

describe("getPlaylistTracks", () => {
  it("calls invoke with id", async () => {
    mockInvoke.mockResolvedValue([]);
    await getPlaylistTracks(3);
    expect(mockInvoke).toHaveBeenCalledWith("get_playlist_tracks", { id: 3 });
  });
});

describe("addTrackToPlaylist", () => {
  it("calls invoke with playlistId and trackId", async () => {
    mockInvoke.mockResolvedValue(undefined);
    await addTrackToPlaylist(1, 42);
    expect(mockInvoke).toHaveBeenCalledWith("add_track_to_playlist", {
      playlistId: 1,
      trackId: 42,
    });
  });
});

describe("removeTrackFromPlaylist", () => {
  it("calls invoke with playlistId and trackId", async () => {
    mockInvoke.mockResolvedValue(undefined);
    await removeTrackFromPlaylist(1, 42);
    expect(mockInvoke).toHaveBeenCalledWith("remove_track_from_playlist", {
      playlistId: 1,
      trackId: 42,
    });
  });
});

describe("reorderPlaylist", () => {
  it("calls invoke with id and newOrder", async () => {
    mockInvoke.mockResolvedValue(undefined);
    await reorderPlaylist(1, [3, 1, 2]);
    expect(mockInvoke).toHaveBeenCalledWith("reorder_playlist", {
      id: 1,
      newOrder: [3, 1, 2],
    });
  });
});

describe("search", () => {
  it("calls invoke with query", async () => {
    const results: SearchResults = {
      tracks: [],
      albums: [],
      playlists: [],
    };
    mockInvoke.mockResolvedValue(results);
    const result = await search("test query");
    expect(mockInvoke).toHaveBeenCalledWith("search", { query: "test query" });
    expect(result).toEqual(results);
  });
});

describe("probeFile", () => {
  it("calls invoke with path", async () => {
    mockInvoke.mockResolvedValue({
      duration_ms: 200000,
      sample_rate: 44100,
      channels: 2,
      format_name: "mp3",
    });
    await probeFile("/music/test.mp3");
    expect(mockInvoke).toHaveBeenCalledWith("probe_file", {
      path: "/music/test.mp3",
    });
  });
});

describe("getLyrics", () => {
  it("calls invoke with path", async () => {
    mockInvoke.mockResolvedValue({
      lines: [],
      is_synced: false,
      source: "test",
    });
    await getLyrics("/music/test.mp3");
    expect(mockInvoke).toHaveBeenCalledWith("get_lyrics", {
      path: "/music/test.mp3",
    });
  });
});
