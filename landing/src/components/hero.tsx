import { useEffect, useState } from "react";
import {
  Download,
  Loader2,
  ChevronDown,
  Monitor,
  Github,
  Check,
} from "lucide-react";
import { AppleIcon, LinuxIcon } from "@/components/icons";
import FeatureGrid from "@/components/features";
import logoIcon from "@/assets/icon.png";
import ScreenshotCarousel from "@/components/screenshot-carousel";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import {
  detectPlatform,
  fetchNightly,
  fetchStable,
  platformJsonKey,
  directUrl,
  downloadAsset,
  type ReleaseData,
} from "@/lib/release";

type ReleaseChannel = "stable" | "nightly";

export default function Hero() {
  const [channel, setChannel] = useState<ReleaseChannel>("stable");
  const [stable, setStable] = useState<ReleaseData | null>(null);
  const [nightly, setNightly] = useState<ReleaseData | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetchStable().then(setStable);
    fetchNightly().then(setNightly);
  }, []);

  const platform = detectPlatform();
  const jsonKey = platformJsonKey(platform);

  const activeData = channel === "stable" ? stable : nightly;
  const activeVersion = activeData?.version ?? "";
  const activeUrl =
    activeData?.platforms[jsonKey]?.url ?? directUrl(platform, channel);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDownloading(true);
    const usedFetch = await downloadAsset(activeUrl);
    if (usedFetch) {
      setIsDownloading(false);
    } else {
      // window.open fallback — no completion signal, timeout the spinner
      setTimeout(() => setIsDownloading(false), 10000);
    }
  };

  return (
    <div className="relative h-dvh w-full bg-background overflow-x-clip flex items-center p-4 sm:p-6 lg:p-12 flex-col">
      <div className="w-full h-full flex-col lg:flex-row">
        {/* Left Content */}
        <div className="flex flex-col items-start w-full h-full justify-between max-w-full lg:max-w-2/3">
          {/* Header */}
          <div className="flex flex-col items-start gap-4 sm:gap-6 w-full">
            <div className="flex items-center gap-2 animate-fade-in-up opacity-0">
              <img
                src={logoIcon}
                alt="Vibe Music Icon"
                className="aspect-square w-10 h-10"
              />
              <span className="text-xl font-bold tracking-tight text-foreground font-heading">
                Vibe Music
              </span>
            </div>
            <div className="flex flex-col items-start gap-4">
              <div className="gap-2 flex flex-col">
                <h1 className="font-heading text-4xl sm:text-5xl xl:text-6xl font-bold tracking-tight text-foreground leading-[1.08] text-balance animate-fade-in-up opacity-0 animation-delay-100">
                  Your music.
                  <br />
                  <span className="text-primary">Your way.</span>
                </h1>
                <p className="text-base xl:text-lg text-muted-foreground leading-relaxed max-w-2xl animate-fade-in-up opacity-0 animation-delay-200">
                  A private, cross-platform desktop music player that puts you
                  in control. No cloud. No tracking. Just your library,
                  beautifully played.
                </p>
              </div>
              <div className="flex flex-row flex-wrap items-center w-full gap-2 animate-fade-in-up opacity-0 animation-delay-300">
                <div className="lg:hidden flex items-center min-h-10 text-sm text-muted-foreground">
                  Desktop app only
                </div>
                <DropdownMenu>
                  <div className="hidden lg:flex">
                    <a
                      href={activeUrl}
                      rel="noopener noreferrer"
                      onClick={handleDownload}
                      className={`inline-flex items-center gap-2 px-6 py-3 rounded-l-lg bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ${isDownloading ? "pointer-events-none opacity-70" : ""}`}
                    >
                      {isDownloading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {isDownloading
                        ? "Downloading..."
                        : `Download${activeVersion ? ` v${activeVersion}` : ""}`}
                    </a>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex items-center justify-center px-2 rounded-r-lg bg-primary text-primary-foreground border-l border-primary-foreground/20 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200">
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                  </div>
                  <DropdownMenuContent
                    align="start"
                    sideOffset={8}
                    className="w-64"
                  >
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Stable Release
                    </div>
                    <DropdownMenuItem
                      className="flex items-center gap-3 py-2.5 cursor-pointer"
                      onClick={() => setChannel("stable")}
                    >
                      <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        S
                      </span>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          Stable{stable ? ` v${stable.version}` : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Latest stable version
                        </span>
                      </div>
                      {channel === "stable" && (
                        <Check className="w-4 h-4 text-primary ml-auto" />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Nightly Build
                    </div>
                    <DropdownMenuItem
                      className="flex items-center gap-3 py-2.5 cursor-pointer"
                      onClick={() => setChannel("nightly")}
                    >
                      <span className="flex size-7 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                        N
                      </span>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          Nightly{nightly ? ` v${nightly.version}` : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Bleeding-edge updates
                        </span>
                      </div>
                      {channel === "nightly" && (
                        <Check className="w-4 h-4 text-primary ml-auto" />
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* GitHub Button */}
                <Button variant="outline" size="lg" asChild>
                  <a
                    href="https://github.com/justCallMeJeg/vibemusic"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2"
                  >
                    <Github className="w-4 h-4" />
                    View on GitHub
                  </a>
                </Button>
              </div>
            </div>
            <FeatureGrid />
          </div>
          {/* Footer */}
          <div className="w-full flex flex-wrap items-center gap-4 text-sm text-muted-foreground animate-fade-in-up opacity-0 animation-delay-700">
            <div className="flex items-center gap-1.5">
              <Monitor className="w-4 h-4" />
              <span>Windows</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AppleIcon className="w-4 h-4" />
              <span>macOS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <LinuxIcon className="w-4 h-4" />
              <span>Linux</span>
            </div>
            <span className="text-border">|</span>
            <span className="text-xs">Open source · GPL-3.0</span>
          </div>
        </div>

        {/* Product Screenshot */}
        <div className="py-12 hidden lg:flex lg:absolute lg:inset-0 lg:translate-x-2/3 animate-fade-in-up opacity-0 animation-delay-500">
          <ScreenshotCarousel />
        </div>
      </div>
    </div>
  );
}
