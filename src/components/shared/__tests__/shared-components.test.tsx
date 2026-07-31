import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "@features/shell/components/error-boundary";
import { PlaybackControls } from "@features/player/components/playback-controls";
import { VolumeControl } from "@features/player/components/volume-control";
import { EmptyState } from "@/components/shared/empty-state";
import { GridSkeleton } from "@/components/shared/grid-skeleton";
import { Music, VolumeX } from "lucide-react";

function getButtons(container: HTMLElement) {
  return container.querySelectorAll("button");
}

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>child content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("child content")).toBeDefined();
  });

  it("renders fallback UI on error", () => {
    const Bomb = () => {
      throw new Error("boom");
    };
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("boom")).toBeDefined();
    expect(screen.getByText("Reload App")).toBeDefined();
  });

  it("catches errors without a message", () => {
    const Bomb = () => {
      throw new Error();
    };
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText("An unexpected error occurred.")).toBeDefined();
  });
});

describe("PlaybackControls", () => {
  const defaultProps = {
    isPlaying: false,
    shuffle: false,
    repeat: "off" as const,
    onToggleShuffle: vi.fn(),
    onPrevious: vi.fn(),
    onPlayPause: vi.fn(),
    onNext: vi.fn(),
    onToggleRepeat: vi.fn(),
  };

  it("renders five control buttons", () => {
    const { container } = render(<PlaybackControls {...defaultProps} />);
    expect(getButtons(container).length).toBe(5);
  });

  it("shows pause icon when playing", () => {
    const { container } = render(<PlaybackControls {...defaultProps} isPlaying={true} />);
    const buttons = getButtons(container);
    // Center button (index 2) is play/pause
    const playBtn = buttons[2];
    expect(playBtn.innerHTML).toContain("lucide-pause");
  });

  it("shows play icon when not playing", () => {
    const { container } = render(<PlaybackControls {...defaultProps} isPlaying={false} />);
    const buttons = getButtons(container);
    const playBtn = buttons[2];
    expect(playBtn.innerHTML).toContain("lucide-play");
  });

  it("calls onPlayPause when play/pause clicked", () => {
    const onPlayPause = vi.fn();
    const { container } = render(<PlaybackControls {...defaultProps} onPlayPause={onPlayPause} />);
    fireEvent.click(getButtons(container)[2]);
    expect(onPlayPause).toHaveBeenCalledOnce();
  });

  it("calls onNext when next clicked", () => {
    const onNext = vi.fn();
    const { container } = render(<PlaybackControls {...defaultProps} onNext={onNext} />);
    fireEvent.click(getButtons(container)[3]);
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("calls onPrevious when previous clicked", () => {
    const onPrevious = vi.fn();
    const { container } = render(<PlaybackControls {...defaultProps} onPrevious={onPrevious} />);
    fireEvent.click(getButtons(container)[1]);
    expect(onPrevious).toHaveBeenCalledOnce();
  });

  it("calls onToggleShuffle when shuffle clicked", () => {
    const onToggleShuffle = vi.fn();
    const { container } = render(<PlaybackControls {...defaultProps} onToggleShuffle={onToggleShuffle} />);
    fireEvent.click(getButtons(container)[0]);
    expect(onToggleShuffle).toHaveBeenCalledOnce();
  });

  it("calls onToggleRepeat when repeat clicked", () => {
    const onToggleRepeat = vi.fn();
    const { container } = render(<PlaybackControls {...defaultProps} onToggleRepeat={onToggleRepeat} />);
    fireEvent.click(getButtons(container)[4]);
    expect(onToggleRepeat).toHaveBeenCalledOnce();
  });

  it("applies active style to shuffle when enabled", () => {
    const { container } = render(<PlaybackControls {...defaultProps} shuffle={true} />);
    const shuffleBtn = getButtons(container)[0];
    expect(shuffleBtn.className).toContain("text-primary");
  });
});

describe("VolumeControl", () => {
  it("renders volume slider and mute button", () => {
    const { container } = render(<VolumeControl volume={0.5} onVolumeChange={vi.fn()} onToggleMute={vi.fn()} />);
    expect(getButtons(container).length).toBe(1);
    expect(container.querySelector('[role="slider"]')).toBeDefined();
  });

  it("shows VolumeX icon when volume is 0", () => {
    const { container } = render(<VolumeControl volume={0} onVolumeChange={vi.fn()} onToggleMute={vi.fn()} />);
    expect(getButtons(container)[0].innerHTML).toContain("lucide-volume-x");
  });

  it("shows Volume2 icon when volume >= 0.5", () => {
    const { container } = render(<VolumeControl volume={0.8} onVolumeChange={vi.fn()} onToggleMute={vi.fn()} />);
    expect(getButtons(container)[0].innerHTML).toContain("lucide-volume-2");
  });

  it("shows Volume1 icon when volume < 0.5 and > 0", () => {
    const { container } = render(<VolumeControl volume={0.3} onVolumeChange={vi.fn()} onToggleMute={vi.fn()} />);
    expect(getButtons(container)[0].innerHTML).toContain("lucide-volume-1");
  });

  it("calls onToggleMute when mute button clicked", () => {
    const onToggleMute = vi.fn();
    const { container } = render(<VolumeControl volume={0.5} onVolumeChange={vi.fn()} onToggleMute={onToggleMute} />);
    fireEvent.click(getButtons(container)[0]);
    expect(onToggleMute).toHaveBeenCalledOnce();
  });
});

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState icon={Music} title="No tracks" description="Add some music to get started" />);
    expect(screen.getByText("No tracks")).toBeDefined();
    expect(screen.getByText("Add some music to get started")).toBeDefined();
  });

  it("renders action content when provided", () => {
    render(
      <EmptyState
        icon={VolumeX}
        title="Empty"
        description="No content"
        action={<button type="button">Add Item</button>}
      />,
    );
    expect(screen.getByRole("button", { name: /add item/i })).toBeDefined();
  });
});

describe("GridSkeleton", () => {
  it("renders default number of items", () => {
    render(
      <GridSkeleton renderItem={(i) => <div key={i}>item {i}</div>} />,
    );
    expect(screen.getByText("item 0")).toBeDefined();
    expect(screen.getByText("item 14")).toBeDefined();
  });

  it("renders custom count", () => {
    render(
      <GridSkeleton renderItem={(i) => <div key={i}>s{i}</div>} count={3} />,
    );
    expect(screen.getByText("s0")).toBeDefined();
    expect(screen.getByText("s1")).toBeDefined();
    expect(screen.getByText("s2")).toBeDefined();
  });
});
