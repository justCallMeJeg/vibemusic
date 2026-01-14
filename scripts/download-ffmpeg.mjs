import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import AdmZip from "adm-zip";
import { Readable } from "stream";
import { finished } from "stream/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const binariesDir = path.resolve(__dirname, "../src-tauri/binaries");

if (!fs.existsSync(binariesDir)) {
  fs.mkdirSync(binariesDir, { recursive: true });
}

// OS/Arch Detection
const platform = process.platform;
const arch = process.arch;

console.log(`Detected platform: ${platform}, arch: ${arch}`);

let targetTriple = "";
let ffmpegUrl = "";
let ffprobeUrl = "";
let isWindows = false;

if (platform === "win32") {
  isWindows = true;
  targetTriple = "x86_64-pc-windows-msvc";
  // Gyan.dev Release Essentials (Includes both ffmpeg and ffprobe)
  ffmpegUrl =
    "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip";
  // No separate ffprobe url needed for windows as it's in the same zip
} else if (platform === "darwin") {
  targetTriple = "x86_64-apple-darwin";
  ffmpegUrl = "https://evermeet.cx/ffmpeg/ffmpeg.zip";
  ffprobeUrl = "https://evermeet.cx/ffmpeg/ffprobe.zip";
} else {
  console.log(
    "Linux/Other platform detected. Falling back to old 4.4.1 builds for now (manual update recommended)."
  );
  targetTriple = "x86_64-unknown-linux-gnu";
  ffmpegUrl =
    "https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-linux-64.zip";
  ffprobeUrl =
    "https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffprobe-4.4.1-linux-64.zip";
}

async function downloadAndExtract(url, componentName, searchPattern) {
  if (!url) return;

  console.log(`Downloading ${componentName} from: ${url}`);
  const tempZip = path.join(binariesDir, `${componentName}_temp.zip`);

  try {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Failed to fetch: ${response.statusText}`);

    const fileStream = fs.createWriteStream(tempZip);
    await finished(Readable.fromWeb(response.body).pipe(fileStream));

    console.log(`Download complete. Extracting...`);

    const zip = new AdmZip(tempZip);
    const zipEntries = zip.getEntries();

    // Find the file we want
    let foundEntry = null;

    // Windows zips have a folder structure like "ffmpeg-6.0.../bin/ffmpeg.exe"
    // Mac zips (from evermeet) are just the binary "ffmpeg"

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      const entryName = entry.entryName; // Full path inside zip
      const fileName = path.basename(entryName);

      if (fileName === searchPattern) {
        foundEntry = entry;
        break;
      }
    }

    if (foundEntry) {
      console.log(`Found binary: ${foundEntry.entryName}`);

      // Extract to binaries dir
      // We use extractEntryTo which extracts to the specific folder
      // But it keeps the path structure by default? No, the second arg is target path.
      // Third arg is 'maintainEntryPath'. We set to false to flatten.
      // Wait, adm-zip extractEntryTo(entry, targetPath, maintainEntryPath, overwrite)

      zip.extractEntryTo(foundEntry, binariesDir, false, true);

      // Rename to include target triple
      const extractedName = path.basename(foundEntry.entryName);
      const finalName = `${componentName}-${targetTriple}${
        isWindows ? ".exe" : ""
      }`;
      const sourcePath = path.join(binariesDir, extractedName);
      const destPath = path.join(binariesDir, finalName);

      // Remove existing
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);

      fs.renameSync(sourcePath, destPath);
      console.log(`Saved to ${destPath}`);

      // Unix permissions
      if (platform !== "win32") {
        fs.chmodSync(destPath, 0o755);
      }
    } else {
      console.error(`Could not find ${searchPattern} inside the zip!`);
    }

    // Cleanup zip
    fs.unlinkSync(tempZip);
  } catch (error) {
    console.error(`Error setting up ${componentName}:`, error);
  }
}

async function main() {
  if (isWindows) {
    // Windows has both in one zip
    // We will download it once, and extract both files from it manually?
    // Actually downloadAndExtract function downloads the zip every time.
    // Let's modify logic or just accept double download for simplicity of the script updates (cached by OS/network usually okay)
    // Or better: pass the same zip path?
    // Let's just download twice for now to be safe and robust against future changes where they might be separate.
    // Actually gyan.dev zip is ~100MB, double download is bad.

    try {
      console.log("Downloading FFmpeg+FFprobe Bundle...");
      const tempZip = path.join(binariesDir, `ffmpeg_bundle.zip`);
      const response = await fetch(ffmpegUrl);
      if (!response.ok)
        throw new Error(`Failed to fetch: ${response.statusText}`);

      const fileStream = fs.createWriteStream(tempZip);
      await finished(Readable.fromWeb(response.body).pipe(fileStream));

      console.log("Download complete. Extracting...");

      const zip = new AdmZip(tempZip);
      const entries = zip.getEntries();

      const tools = [
        { name: "ffmpeg", pattern: "ffmpeg.exe" },
        { name: "ffprobe", pattern: "ffprobe.exe" },
      ];

      for (const tool of tools) {
        const entry = entries.find(
          (e) => !e.isDirectory && path.basename(e.entryName) === tool.pattern
        );
        if (entry) {
          zip.extractEntryTo(entry, binariesDir, false, true);
          const finalName = `${tool.name}-${targetTriple}.exe`;

          // Rename logic: extractEntryTo puts it in binariesDir/ffmpeg.exe
          // We need to move binariesDir/ffmpeg.exe to binariesDir/ffmpeg-x86...exe
          const extractedPath = path.join(binariesDir, tool.pattern);
          const finalPath = path.join(binariesDir, finalName);

          if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
          fs.renameSync(extractedPath, finalPath);

          console.log(`Extracted ${finalName}`);
        } else {
          console.error(`Could not find ${tool.pattern} in zip`);
        }
      }

      fs.unlinkSync(tempZip);
    } catch (error) {
      console.error("Windows Setup Error:", error);
      process.exit(1);
    }
  } else {
    // Mac / Linux
    await downloadAndExtract(ffmpegUrl, "ffmpeg", "ffmpeg");
    await downloadAndExtract(ffprobeUrl, "ffprobe", "ffprobe");
  }

  console.log("FFmpeg setup complete!");
}

main();
