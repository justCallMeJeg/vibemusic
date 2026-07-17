import { useState, useEffect, useRef, useCallback } from "react";
import { useCurrentPage } from "@/stores/navigation-store";
import { useIsPlayerVisible } from "@/stores/audio-store";
import { cn } from "@/lib/utils";
import { SettingsNav, type SettingsSectionId } from "./settings/settings-nav";
import { SettingsGeneral } from "./settings/settings-general";
import { SettingsAppearance } from "./settings/settings-appearance";
import { SettingsNavigation } from "./settings/settings-navigation";
import { SettingsLibrary } from "./settings/settings-library";
import { SettingsAudio } from "./settings/settings-audio";
import { SettingsAbout } from "./settings/settings-about";

export default function SettingsPage() {
  const currentPage = useCurrentPage();
  const isPlayerVisible = useIsPlayerVisible();
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("general");
  const sectionRefs = useRef<Map<SettingsSectionId, HTMLElement>>(new Map());
  const isScrolling = useRef(false);

  const setSectionRef = useCallback(
    (id: SettingsSectionId) => (el: HTMLElement | null) => {
      if (el) {
        sectionRefs.current.set(id, el);
      } else {
        sectionRefs.current.delete(id);
      }
    },
    [],
  );

  useEffect(() => {
    const sections = sectionRefs.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrolling.current) return;

        let maxRatio = 0;
        let maxId: SettingsSectionId | null = null;
        for (const entry of entries) {
          if (entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            maxId = entry.target.id as SettingsSectionId;
          }
        }
        if (maxId) {
          setActiveSection(maxId);
        }
      },
      {
        rootMargin: "-64px 0px -50% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    sections.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (currentPage === "about") {
      const aboutEl = sectionRefs.current.get("about");
      if (aboutEl) {
        const prefersReducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        aboutEl.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
        });
      }
    }
  }, [currentPage]);

  const handleNavigate = (id: SettingsSectionId) => {
    const el = sectionRefs.current.get(id);
    if (!el) return;

    isScrolling.current = true;
    setActiveSection(id);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });

    setTimeout(
      () => {
        isScrolling.current = false;
      },
      prefersReducedMotion ? 0 : 500,
    );
  };

  return (
    <div className="flex flex-col w-full h-full">
      <SettingsNav activeSection={activeSection} onNavigate={handleNavigate} />
      <main className="flex-1 overflow-y-auto">
        <div
          className={cn(
            "flex flex-col max-w-3xl m-auto px-8 pt-4 gap-8",
            isPlayerVisible ? "pb-player-bar" : "pb-8",
          )}
        >
          <section
            ref={setSectionRef("general")}
            id="general"
            className="scroll-mt-18"
          >
            <SettingsGeneral />
          </section>
          <section
            ref={setSectionRef("appearance")}
            id="appearance"
            className="scroll-mt-18"
          >
            <SettingsAppearance />
          </section>
          <section
            ref={setSectionRef("navigation")}
            id="navigation"
            className="scroll-mt-18"
          >
            <SettingsNavigation />
          </section>
          <section
            ref={setSectionRef("library")}
            id="library"
            className="scroll-mt-18"
          >
            <SettingsLibrary />
          </section>
          <section
            ref={setSectionRef("audio")}
            id="audio"
            className="scroll-mt-18"
          >
            <SettingsAudio />
          </section>
          <section
            ref={setSectionRef("about")}
            id="about"
            className="scroll-mt-18"
          >
            <SettingsAbout />
          </section>
        </div>
      </main>
    </div>
  );
}
