import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { useAudioStore } from "./audio-store";
import type { Track } from "@/lib/api";

const mockInvoke = vi.mocked(invoke);

const makeTrack = (id: number, title: string): Track => ({
  id,
  title,
  artist: "Artist",
  artist_id: id,
  artist_names: ["Artist"],
  artist_ids: [id],
  artist_roles: ["main"],
  album: "Album",
  album_id: 1,
  duration_ms: 200000,
  file_path: `/music/${title}.mp3`,
  artwork_path: null,
  track_number: id,
});

beforeEach(() => {
  mockInvoke.mockReset();
  mockInvoke.mockResolvedValue(undefined);
  useAudioStore.setState({
    status: "stopped",
    currentTrack: null,
    volume: 1.0,
    queue: [],
    currentIndex: -1,
    shuffle: false,
    repeat: "off",
    sidePanel: "none",
    position: 0,
    duration: 0,
    _previousVolume: 1.0,
    _isDraggingSlider: false,
    _listenersInitialized: false,
    _lastProgressUpdate: 0,
    _lastSeekTime: 0,
    _isTransitioning: false,
  });
});

describe("audio-store", () => {
  it("has correct initial state", () => {
    const s = useAudioStore.getState();
    expect(s.status).toBe("stopped");
    expect(s.currentTrack).toBeNull();
    expect(s.volume).toBe(1.0);
    expect(s.queue).toEqual([]);
    expect(s.currentIndex).toBe(-1);
    expect(s.shuffle).toBe(false);
    expect(s.repeat).toBe("off");
    expect(s.sidePanel).toBe("none");
  });

  describe("play", () => {
    it("sets status to loading and calls invoke", async () => {
      const track = makeTrack(1, "Song A");
      await useAudioStore.getState().play(track);

      const s = useAudioStore.getState();
      expect(s.currentTrack).toEqual(track);
      expect(s.status).toBe("loading");
      expect(s.queue).toEqual([track]);
      expect(s.currentIndex).toBe(0);
      expect(mockInvoke).toHaveBeenCalledWith("audio_play", {
        path: track.file_path,
        title: track.title,
        artist: track.artist,
        album: track.album,
        artworkPath: null,
      });
    });

    it("uses provided queue and finds track index", async () => {
      const t1 = makeTrack(1, "A");
      const t2 = makeTrack(2, "B");
      await useAudioStore.getState().play(t2, [t1, t2]);

      const s = useAudioStore.getState();
      expect(s.queue).toEqual([t1, t2]);
      expect(s.currentIndex).toBe(1);
      expect(s.currentTrack).toEqual(t2);
    });
  });

  describe("pause / resume", () => {
    it("calls audio_pause invoke", async () => {
      await useAudioStore.getState().pause();
      expect(mockInvoke).toHaveBeenCalledWith("audio_pause");
    });

    it("calls audio_resume invoke", async () => {
      await useAudioStore.getState().resume();
      expect(mockInvoke).toHaveBeenCalledWith("audio_resume");
    });
  });

  describe("stop", () => {
    it("calls audio_stop invoke", async () => {
      await useAudioStore.getState().stop();
      expect(mockInvoke).toHaveBeenCalledWith("audio_stop");
    });
  });

  describe("next", () => {
    it("calls audio_stop when queue is empty", async () => {
      useAudioStore.setState({ queue: [], currentIndex: -1, currentTrack: null });
      await useAudioStore.getState().next();
      expect(mockInvoke).toHaveBeenCalledWith("audio_stop");
      expect(useAudioStore.getState().status).toBe("stopped");
    });

    it("advances to next track in queue", async () => {
      const t1 = makeTrack(1, "A");
      const t2 = makeTrack(2, "B");
      useAudioStore.setState({ queue: [t1, t2], currentIndex: 0, currentTrack: t1, duration: 200000, position: 50000 });
      await useAudioStore.getState().next();

      const s = useAudioStore.getState();
      expect(s.currentIndex).toBe(1);
      expect(s.currentTrack).toEqual(t2);
      expect(s.status).toBe("loading");
      expect(mockInvoke).toHaveBeenCalledWith("audio_play", expect.objectContaining({ path: t2.file_path }));
    });
  });

  describe("seek", () => {
    it("updates position and calls invoke", async () => {
      await useAudioStore.getState().seek(50000);
      expect(mockInvoke).toHaveBeenCalledWith("audio_seek", { positionMs: 50000 });
      expect(useAudioStore.getState().position).toBe(50000);
    });
  });

  describe("setVolume", () => {
    it("updates volume and calls invoke", async () => {
      await useAudioStore.getState().setVolume(0.5);
      expect(useAudioStore.getState().volume).toBe(0.5);
      expect(mockInvoke).toHaveBeenCalledWith("audio_set_volume", { volume: 0.5 });
    });
  });

  describe("toggleMute", () => {
    it("mutes when volume > 0", async () => {
      useAudioStore.setState({ volume: 0.8, _previousVolume: 0.8 });
      await useAudioStore.getState().toggleMute();
      expect(useAudioStore.getState().volume).toBe(0);
      expect(mockInvoke).toHaveBeenCalledWith("audio_set_volume", { volume: 0 });
    });

    it("unmutes when volume is 0", async () => {
      useAudioStore.setState({ volume: 0, _previousVolume: 0.7 });
      await useAudioStore.getState().toggleMute();
      expect(useAudioStore.getState().volume).toBe(0.7);
      expect(mockInvoke).toHaveBeenCalledWith("audio_set_volume", { volume: 0.7 });
    });
  });

  describe("toggleQueue", () => {
    it("toggles sidePanel between none and queue", () => {
      expect(useAudioStore.getState().sidePanel).toBe("none");
      useAudioStore.getState().toggleQueue();
      expect(useAudioStore.getState().sidePanel).toBe("queue");
      useAudioStore.getState().toggleQueue();
      expect(useAudioStore.getState().sidePanel).toBe("none");
    });
  });

  describe("setSidePanel", () => {
    it("sets the side panel view", () => {
      useAudioStore.getState().setSidePanel("lyrics");
      expect(useAudioStore.getState().sidePanel).toBe("lyrics");
      useAudioStore.getState().setSidePanel("none");
      expect(useAudioStore.getState().sidePanel).toBe("none");
    });
  });

  describe("toggleShuffle", () => {
    it("toggles shuffle flag", () => {
      useAudioStore.getState().toggleShuffle();
      expect(useAudioStore.getState().shuffle).toBe(true);
      useAudioStore.getState().toggleShuffle();
      expect(useAudioStore.getState().shuffle).toBe(false);
    });
  });

  describe("toggleRepeat", () => {
    it("cycles: off -> all -> one -> off", () => {
      expect(useAudioStore.getState().repeat).toBe("off");
      useAudioStore.getState().toggleRepeat();
      expect(useAudioStore.getState().repeat).toBe("all");
      useAudioStore.getState().toggleRepeat();
      expect(useAudioStore.getState().repeat).toBe("one");
      useAudioStore.getState().toggleRepeat();
      expect(useAudioStore.getState().repeat).toBe("off");
    });
  });

  describe("addToQueue", () => {
    it("appends a new track to empty queue", () => {
      const t1 = makeTrack(1, "A");
      useAudioStore.getState().addToQueue(t1);
      expect(useAudioStore.getState().queue).toEqual([t1]);
    });

    it("moves existing track to end", () => {
      const t1 = makeTrack(1, "A");
      const t2 = makeTrack(2, "B");
      useAudioStore.setState({ queue: [t1, t2], currentIndex: 0 });
      useAudioStore.getState().addToQueue(t1);
      const s = useAudioStore.getState();
      expect(s.queue).toEqual([t2, t1]);
      expect(s.queue.map((t) => t.id)).toEqual([2, 1]);
    });

    it("adjusts currentIndex when preceding track is moved", () => {
      const t1 = makeTrack(1, "A");
      const t2 = makeTrack(2, "B");
      const t3 = makeTrack(3, "C");
      useAudioStore.setState({ queue: [t1, t2, t3], currentIndex: 2 });
      useAudioStore.getState().addToQueue(t1);
      expect(useAudioStore.getState().currentIndex).toBe(1);
    });
  });

  describe("playNext", () => {
    it("inserts track after currentIndex", () => {
      const t1 = makeTrack(1, "A");
      const t2 = makeTrack(2, "B");
      useAudioStore.setState({ queue: [t1], currentIndex: 0 });
      useAudioStore.getState().playNext(t2);
      expect(useAudioStore.getState().queue.map((t) => t.id)).toEqual([1, 2]);
    });
  });

  describe("removeFromQueue", () => {
    it("removes track by id", () => {
      const t1 = makeTrack(1, "A");
      const t2 = makeTrack(2, "B");
      useAudioStore.setState({ queue: [t1, t2], currentIndex: 0 });
      useAudioStore.getState().removeFromQueue(2);
      expect(useAudioStore.getState().queue).toEqual([t1]);
    });

    it("adjusts currentIndex when removing before it", () => {
      const t1 = makeTrack(1, "A");
      const t2 = makeTrack(2, "B");
      const t3 = makeTrack(3, "C");
      useAudioStore.setState({ queue: [t1, t2, t3], currentIndex: 2 });
      useAudioStore.getState().removeFromQueue(1);
      expect(useAudioStore.getState().currentIndex).toBe(1);
    });
  });

  describe("reorderQueue", () => {
    it("replaces the queue entirely", () => {
      const t1 = makeTrack(1, "A");
      const t2 = makeTrack(2, "B");
      const t3 = makeTrack(3, "C");
      useAudioStore.setState({ queue: [t1, t2, t3] });
      useAudioStore.getState().reorderQueue([t3, t1, t2]);
      expect(useAudioStore.getState().queue.map((t) => t.id)).toEqual([3, 1, 2]);
    });
  });

  describe("clearQueue", () => {
    it("empties the queue", () => {
      const t1 = makeTrack(1, "A");
      useAudioStore.setState({ queue: [t1], currentIndex: 0 });
      useAudioStore.getState().clearQueue();
      expect(useAudioStore.getState().queue).toEqual([]);
      expect(useAudioStore.getState().currentIndex).toBe(-1);
    });
  });

  describe("setPosition", () => {
    it("updates position", () => {
      useAudioStore.getState().setPosition(12345);
      expect(useAudioStore.getState().position).toBe(12345);
    });
  });

  describe("setDraggingSlider", () => {
    it("sets dragging state", () => {
      useAudioStore.getState().setDraggingSlider(true);
      expect(useAudioStore.getState()._isDraggingSlider).toBe(true);
      useAudioStore.getState().setDraggingSlider(false);
      expect(useAudioStore.getState()._isDraggingSlider).toBe(false);
    });
  });
});
