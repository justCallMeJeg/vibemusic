import { Button } from "./components/ui/button";
import "@fontsource/instrument-sans";
import "./styles/globals.css";
import MusicCard from "./components/ui/music-card";

function App() {
  return (
    <main className="flex h-dvh w-dvw px-8 py-6">
      <div className="flex flex-col size-full">
        <MusicCard/>
        <MusicCard/>
        <MusicCard/>
        <MusicCard/>
        <MusicCard/>
      </div>
    </main>
  );
}

export default App;
