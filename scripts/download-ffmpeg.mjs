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

const GITHUB_REPO =
  "https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1";

if (platform === "win32") {
  targetTriple = "x86_64-pc-windows-msvc";
  ffmpegUrl = `${GITHUB_REPO}/ffmpeg-4.4.1-win-64.zip`;
  ffprobeUrl = `${GITHUB_REPO}/ffprobe-4.4.1-win-64.zip`;
} else if (platform === "darwin") {
  targetTriple = "x86_64-apple-darwin";
  ffmpegUrl = `${GITHUB_REPO}/ffmpeg-4.4.1-osx-64.zip`;
  ffprobeUrl = `${GITHUB_REPO}/ffprobe-4.4.1-osx-64.zip`;
} else if (platform === "linux") {
  targetTriple = "x86_64-unknown-linux-gnu";
  ffmpegUrl = `${GITHUB_REPO}/ffmpeg-4.4.1-linux-64.zip`;
  ffprobeUrl = `${GITHUB_REPO}/ffprobe-4.4.1-linux-64.zip`;
} else {
  console.error(`Unsupported platform: ${platform}`);
  process.exit(1);
}

async function downloadComponent(url, componentName) {
  console.log(`Downloading ${componentName} from: ${url}`);

  // Cleanup any existing component file
  const existingFile = path.join(
    binariesDir,
    `${componentName}-${targetTriple}${platform === "win32" ? ".exe" : ""}`
  );
  if (fs.existsSync(existingFile)) {
    console.log(`Removing existing ${componentName}...`);
    fs.unlinkSync(existingFile);
  }

  const tempZip = path.join(binariesDir, `${componentName}.zip`);

  try {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Failed to fetch: ${response.statusText}`);

    const fileStream = fs.createWriteStream(tempZip);
    await finished(Readable.fromWeb(response.body).pipe(fileStream));

    console.log(`Download of ${componentName} complete. Extracting...`);

    const zip = new AdmZip(tempZip);
    zip.extractAllTo(binariesDir, true);

    // Cleanup zip
    fs.unlinkSync(tempZip);

    // Rename binaries
    const files = fs.readdirSync(binariesDir);
    files.forEach((file) => {
      if (file.includes(targetTriple)) return;

      const name = path.parse(file).name;
      const ext = path.extname(file);

      // Exact match to avoid renaming random files
      if (name === componentName) {
        const newName = `${name}-${targetTriple}${ext}`;
        try {
          fs.renameSync(
            path.join(binariesDir, file),
            path.join(binariesDir, newName)
          );
          console.log(`Renamed ${file} to ${newName}`);
        } catch (e) {
          console.error(`Failed to rename ${file}:`, e);
        }
      }
    });
  } catch (error) {
    console.error(`Error setting up ${componentName}:`, error);
    process.exit(1);
  }
}

async function main() {
  await downloadComponent(ffmpegUrl, "ffmpeg");
  await downloadComponent(ffprobeUrl, "ffprobe");
  console.log("FFmpeg setup complete!");
}

main();
