# Check if cargo-sweep is installed
if (-not (Get-Command "cargo-sweep" -ErrorAction SilentlyContinue)) {
    Write-Host "Installing cargo-sweep..."
    cargo install cargo-sweep
}

# Run sweep
Write-Host "Cleaning build artifacts older than 7 days..."
cd src-tauri
cargo sweep --time 7

Write-Host "Done! If you need more space, run 'cargo clean' to delete everything."
