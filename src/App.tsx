import { Button } from "./components/ui/button";

function App() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              <span className="bg-gradient-to-r from-primary to-chart-1 bg-clip-text text-transparent">
                Vibe
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Your personal music library, beautifully organized. Experience
              your music collection like never before.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Button size="lg">Get Started</Button>
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-1/4 top-0 h-96 w-96 rounded-full bg-chart-1/20 blur-3xl" />
          <div className="absolute -right-1/4 bottom-0 h-96 w-96 rounded-full bg-chart-2/20 blur-3xl" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-card">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Tailwind CSS is Working!
            </h2>
            <p className="mt-4 text-muted-foreground">
              This page demonstrates various Tailwind CSS utilities and your
              custom design tokens.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature Card 1 */}
            <div className="group rounded-xl border border-border bg-background p-6 transition-all hover:shadow-lg hover:border-primary/50">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                Music Library
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Organize and browse your entire music collection with smart
                categorization and search.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="group rounded-xl border border-border bg-background p-6 transition-all hover:shadow-lg hover:border-chart-2/50">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2 text-white">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold group-hover:text-chart-2 transition-colors">
                Favorites
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Quick access to your most loved tracks and albums, always at
                your fingertips.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="group rounded-xl border border-border bg-background p-6 transition-all hover:shadow-lg hover:border-chart-4/50">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-chart-4 text-white">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold group-hover:text-chart-4 transition-colors">
                Playlists
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create and manage custom playlists for every mood and occasion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Color Palette Demo */}
      <section className="py-16 bg-secondary/50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h3 className="text-xl font-semibold mb-6 text-center">
            Design System Colors
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-lg bg-primary shadow-md" />
              <span className="text-xs text-muted-foreground">Primary</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-lg bg-secondary shadow-md border" />
              <span className="text-xs text-muted-foreground">Secondary</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-lg bg-accent shadow-md border" />
              <span className="text-xs text-muted-foreground">Accent</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-lg bg-destructive shadow-md" />
              <span className="text-xs text-muted-foreground">Destructive</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-lg bg-chart-1 shadow-md" />
              <span className="text-xs text-muted-foreground">Chart 1</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-lg bg-chart-2 shadow-md" />
              <span className="text-xs text-muted-foreground">Chart 2</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-lg bg-chart-3 shadow-md" />
              <span className="text-xs text-muted-foreground">Chart 3</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-lg bg-chart-4 shadow-md" />
              <span className="text-xs text-muted-foreground">Chart 4</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <p className="text-sm text-muted-foreground">
            Built with{" "}
            <span className="font-semibold text-foreground">
              Tailwind CSS v4
            </span>{" "}
            +{" "}
            <span className="font-semibold text-foreground">React</span> +{" "}
            <span className="font-semibold text-foreground">Tauri</span>
          </p>
        </div>
      </footer>
    </main>
  );
}

export default App;
