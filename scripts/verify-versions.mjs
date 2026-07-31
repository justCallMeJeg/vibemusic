import { readFileSync } from "fs";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

const pkgVersion = readJson("package.json").version;
const tauriVersion = readJson("src-tauri/tauri.conf.json").version;

const cargoToml = readFileSync("src-tauri/Cargo.toml", "utf-8");
const cargoMatch = cargoToml.match(/^version = "([^"]+)"/m);
const cargoVersion = cargoMatch ? cargoMatch[1] : null;

const cargoLock = readFileSync("src-tauri/Cargo.lock", "utf-8");
const lockMatch = cargoLock.match(/^name = "vibemusic"\r?\nversion = "([^"]+)"/m);
const lockVersion = lockMatch ? lockMatch[1] : null;

const versions = [
  ["package.json", pkgVersion],
  ["src-tauri/tauri.conf.json", tauriVersion],
  ["src-tauri/Cargo.toml", cargoVersion],
  ["src-tauri/Cargo.lock", lockVersion],
];

let ok = true;
for (const [file, ver] of versions) {
  if (ver !== pkgVersion) {
    console.error(`MISMATCH: ${file} has version "${ver}", expected "${pkgVersion}"`);
    ok = false;
  } else {
    console.log(`  ✓ ${file} → ${ver}`);
  }
}

if (ok) {
  console.log(`\nAll versions match: ${pkgVersion}`);
} else {
  process.exit(1);
}
