import { readFileSync, writeFileSync } from "fs";

const args = process.argv.slice(2);
const bumpType = args[0] || "patch";

if (!["patch", "minor", "major"].includes(bumpType)) {
  console.error(`Invalid bump type: "${bumpType}". Use patch, minor, or major.`);
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

function parseVersion(v) {
  const parts = v.split(".").map(Number);
  return { major: parts[0], minor: parts[1], patch: parts[2] };
}

function bumpVersion(v, type) {
  const ver = parseVersion(v);
  if (type === "major") {
    ver.major += 1;
    ver.minor = 0;
    ver.patch = 0;
  } else if (type === "minor") {
    ver.minor += 1;
    ver.patch = 0;
  } else {
    ver.patch += 1;
  }
  return `${ver.major}.${ver.minor}.${ver.patch}`;
}

// Read current version from package.json
const pkg = readJson("package.json");
const currentVersion = pkg.version;
const newVersion = bumpVersion(currentVersion, bumpType);

console.log(`Bumping version: ${currentVersion} → ${newVersion} (${bumpType})`);

// Update package.json
pkg.version = newVersion;
writeJson("package.json", pkg);

// Update tauri.conf.json
const tauriConf = readJson("src-tauri/tauri.conf.json");
tauriConf.version = newVersion;
writeJson("src-tauri/tauri.conf.json", tauriConf);

// Update Cargo.toml
let cargoToml = readFileSync("src-tauri/Cargo.toml", "utf-8");
cargoToml = cargoToml.replace(/^version = ".*"/m, `version = "${newVersion}"`);
writeFileSync("src-tauri/Cargo.toml", cargoToml);

// Update Cargo.lock (package version, not workspace members)
let cargoLock = readFileSync("src-tauri/Cargo.lock", "utf-8");
cargoLock = cargoLock.replace(/^name = "vibemusic"\nversion = ".*"/m, `name = "vibemusic"\nversion = "${newVersion}"`);
writeFileSync("src-tauri/Cargo.lock", cargoLock);

console.log("Done. All 4 files updated.");
