<#
╔══════════════════════════════════════════════════════════════╗
║                VibeMusic Git Wizard                         ║
║  Interactive guide for common git workflows in this project ║
╚══════════════════════════════════════════════════════════════╝
#>

#Requires -Version 5.1

# --- helpers -----------------------------------------------------------------

function Color {
    param([string]$Text, [string]$Color)
    $c = switch ($Color) {
        green   { "Green" }; yellow { "Yellow" }; red { "Red" }
        cyan    { "Cyan" };  magenta { "Magenta" }; grey { "DarkGray" }
        default { "White" }
    }
    Write-Host $Text -ForegroundColor $c
}

function PromptYes {
    Color "  Proceed? [y/N] " -Color yellow
    $a = Read-Host
    return $a -eq "y"
}

function PauseAndBack {
    Color "  Press Enter to go back..." -Color grey
    $null = Read-Host
}

function GetBranch {
    return (git rev-parse --abbrev-ref HEAD 2>$null)
}

function GetStatus {
    $s = git status --porcelain 2>$null
    if (-not $s) { return "clean" }
    return "dirty ($($s.Count) uncommitted)"
}

function RunGit {
    param([string]$Cmd, [string]$Label)
    Color "  Running: git $Cmd" -Color cyan
    $out = Invoke-Expression "git $Cmd 2>&1"
    $exit = $LASTEXITCODE
    if ($exit -ne 0) {
        Color "  ERROR: $out" -Color red
        return $false
    }
    if ($out) { $out | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray } }
    return $true
}

function ShowHeader {
    Clear-Host
    $branch = GetBranch
    $status = GetStatus
    Color "========================================" -Color magenta
    Color "    VibeMusic Git Wizard" -Color magenta
    Color "========================================" -Color magenta
    Color "  Branch: $branch  |  Status: $status`n" -Color grey
}

function GetVersionFromPackage {
    try {
        $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
        return $pkg.version
    } catch {
        return "unknown"
    }
}

# --- wizards -----------------------------------------------------------------

function Wizard-SyncDevToMaster {
    ShowHeader
    Color "=== Sync: Reset dev -> master ===" -Color cyan
    Color "  This will make dev EXACTLY match master." -Color yellow
    if (-not (PromptYes)) { return }
    $ok = RunGit "checkout dev" "switch to dev"
    if (-not $ok) { PauseAndBack; return }
    $ok = RunGit "reset --hard master" "reset dev to master"
    if (-not $ok) { PauseAndBack; return }
    $ok = RunGit "push origin dev --force" "force push dev"
    if (-not $ok) { PauseAndBack; return }
    Color "  Done. dev is now identical to master." -Color green
    PauseAndBack
}

function Wizard-SyncMasterIntoDev {
    ShowHeader
    Color "=== Sync: Merge master into dev ===" -Color cyan
    Color "  Merges the latest master changes into dev." -Color green
    if (-not (PromptYes)) { return }
    $ok = RunGit "checkout dev" "switch to dev"
    if (-not $ok) { PauseAndBack; return }
    $ok = RunGit "merge master" "merge master into dev"
    if (-not $ok) { PauseAndBack; return }
    $ok = RunGit "push origin dev" "push dev"
    if (-not $ok) { PauseAndBack; return }
    Color "  Done. dev updated with latest master." -Color green
    PauseAndBack
}

function Wizard-CherryPick {
    ShowHeader
    Color "=== Cherry-pick a commit ===" -Color cyan
    Color "  Recent commits (last 10):`n" -Color green
    git log --oneline -10 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    Color "`n  Enter the commit hash to cherry-pick:" -Color cyan
    $hash = Read-Host "  Hash"
    if (-not $hash) { return }
    Color "  Target branch [master]:" -Color cyan
    $target = Read-Host "  Branch"
    if (-not $target) { $target = "master" }
    if (-not (PromptYes)) { return }
    $ok = RunGit "checkout $target" "switch to $target"
    if (-not $ok) { PauseAndBack; return }
    $ok = RunGit "cherry-pick $hash" "cherry-pick $hash"
    if (-not $ok) { PauseAndBack; return }
    $ok = RunGit "push origin $target" "push $target"
    if (-not $ok) { PauseAndBack; return }
    Color "  Done. Commit $hash cherry-picked to $target." -Color green
    PauseAndBack
}

function Wizard-HotfixCreate {
    ShowHeader
    Color "=== Create hotfix branch ===" -Color cyan
    Color "  Creates a branch from master for urgent fixes." -Color green
    Color "  Enter hotfix name (e.g. crash-on-playback):" -Color cyan
    $name = Read-Host "  Name"
    if (-not $name) { return }
    $branch = "hotfix/$name"
    if (-not (PromptYes)) { return }
    $ok = RunGit "checkout master" "switch to master"
    if (-not $ok) { PauseAndBack; return }
    $ok = RunGit "pull origin master" "pull latest master"
    if (-not $ok) { PauseAndBack; return }
    $ok = RunGit "checkout -b $branch" "create $branch"
    if (-not $ok) { PauseAndBack; return }
    $ok = RunGit "push origin $branch" "push $branch"
    if (-not $ok) { PauseAndBack; return }
    Color "  Done. Created branch: $branch" -Color green
    Color "  Work on your fix, commit, then run 'Finish hotfix'." -Color green
    PauseAndBack
}

function Wizard-HotfixFinish {
    ShowHeader
    Color "=== Finish and merge hotfix ===" -Color cyan
    $branches = git branch -r | Select-String "hotfix/" | ForEach-Object { $_.ToString().Trim() }
    if (-not $branches) {
        Color "  No hotfix branches found." -Color yellow
        PauseAndBack; return
    }
    Color "  Available hotfix branches:`n" -Color green
    $i = 1
    $list = @()
    $branches | ForEach-Object {
        $b = $_ -replace '^origin/',''
        $list += $b
        Color "    [$i] $b" -Color grey
        $i++
    }
    $sel = Read-Host "`n  Select #"
    $idx = [int]$sel - 1
    if ($idx -lt 0 -or $idx -ge $list.Count) {
        Color "  Invalid selection" -Color red
        PauseAndBack; return
    }
    $branch = $list[$idx]
    if (-not (PromptYes)) { return }
    $ok = RunGit "checkout master" "switch to master"
    if (-not $ok) { PauseAndBack; return }
    $ok = RunGit "pull origin master" "pull latest master"
    if (-not $ok) { PauseAndBack; return }
    $ok = RunGit "merge $branch" "merge $branch into master"
    if (-not $ok) { PauseAndBack; return }
    $ok = RunGit "push origin master" "push master"
    if (-not $ok) { PauseAndBack; return }
    $ok = RunGit "branch -d $branch" "delete local $branch"
    if (-not $ok) { PauseAndBack; return }
    $ok = RunGit "push origin --delete $branch" "delete remote $branch"
    if (-not $ok) { PauseAndBack; return }
    Color "  Done. Hotfix $branch merged, branch deleted." -Color green
    PauseAndBack
}

function Wizard-TagCreate {
    ShowHeader
    Color "=== Create a tag ===" -Color cyan
    $v = GetVersionFromPackage
    Color "  Current package.json version: $v" -Color green
    Color "  Enter tag version (e.g. v1.0.1):" -Color cyan
    $tag = Read-Host "  Tag"
    if (-not $tag) { return }
    $existing = git tag -l $tag
    if ($existing) {
        Color "  Tag '$tag' already exists." -Color red
        PauseAndBack; return
    }
    if (-not (PromptYes)) { return }
    $ok = RunGit "tag $tag master" "create $tag"
    if (-not $ok) { PauseAndBack; return }
    $ok = RunGit "push origin $tag" "push $tag"
    if (-not $ok) { PauseAndBack; return }
    Color "  Done. Tag $tag created and pushed." -Color green
    PauseAndBack
}

function Wizard-TagDelete {
    ShowHeader
    Color "=== Delete a tag ===" -Color cyan
    Color "  Existing tags (last 10):`n" -Color green
    $tags = git tag -l "v*" | Sort-Object -Descending { [version](($_ -replace '^v','') -replace '-nightly.*','.0') } | Select-Object -First 10
    $tags | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    Color "`n  Enter tag to delete:" -Color cyan
    $tag = Read-Host "  Tag"
    if (-not $tag) { return }
    Color "  WARNING: This will delete the tag locally AND on GitHub." -Color yellow
    if (-not (PromptYes)) { return }
    $ok = RunGit "tag -d $tag" "delete local $tag"
    if (-not $ok) { PauseAndBack; return }
    $ok = RunGit "push origin :refs/tags/$tag" "delete remote $tag"
    if (-not $ok) { PauseAndBack; return }
    Color "  Done. Tag $tag deleted." -Color green
    PauseAndBack
}

function Wizard-PushSkipCi {
    ShowHeader
    Color "=== Push with [skip ci] ===" -Color cyan
    Color "  Current branch: $(GetBranch)" -Color green
    $s = git status --porcelain
    if ($s) {
        Color "  You have uncommitted changes. Stage all?" -Color yellow
        if (-not (PromptYes)) { PauseAndBack; return }
        $ok = RunGit "add -A" "stage all"
        if (-not $ok) { PauseAndBack; return }
        $ok = RunGit "commit -m 'chore: wizard commit [skip ci]'" "commit with [skip ci]"
        if (-not $ok) { PauseAndBack; return }
    } else {
        Color "  Working tree is clean. Push HEAD as-is?" -Color yellow
        if (-not (PromptYes)) { PauseAndBack; return }
    }
    $ok = RunGit "push origin $(GetBranch)" "push $(GetBranch)"
    if (-not $ok) { PauseAndBack; return }
    Color "  Done. Pushed with [skip ci]." -Color green
    PauseAndBack
}

function Wizard-AmendSkipCi {
    param([switch]$Add)
    $label = if ($Add) { "add [skip ci]" } else { "remove [skip ci]" }
    ShowHeader
    Color "=== Amend last commit -- $label ===" -Color cyan
    $msg = git log -1 --pretty=%B
    Color "  Current message: $msg" -Color grey
    if ($Add) {
        if ($msg -match '\[skip ci\]') {
            Color "  Already has [skip ci]." -Color yellow
            PauseAndBack; return
        }
        $newMsg = "$msg [skip ci]"
    } else {
        if ($msg -notmatch '\[skip ci\]') {
            Color "  No [skip ci] to remove." -Color yellow
            PauseAndBack; return
        }
        $newMsg = $msg -replace '\s*\[skip ci\]',''
    }
    Color "  New message: $newMsg" -Color green
    if (-not (PromptYes)) { return }
    $ok = RunGit "commit --amend -m $($newMsg)" "amend commit"
    if (-not $ok) { PauseAndBack; return }
    Color "  Done. Commit amended." -Color green
    Color "  Note: push with --force if already pushed." -Color yellow
    if (PromptYes) {
        RunGit "push origin $(GetBranch) --force" "force push"
    }
    PauseAndBack
}

function Wizard-ShowCommits {
    ShowHeader
    Color "=== Recent commits ===" -Color cyan
    Color "  Last 20 commits:`n" -Color green
    git log --oneline -20 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    PauseAndBack
}

function Wizard-ShowDiff {
    ShowHeader
    Color "=== dev vs master diff ===" -Color cyan
    $ahead = git rev-list --count master..dev 2>$null
    $behind = git rev-list --count dev..master 2>$null
    if ($ahead -eq $null) { $ahead = 0 }
    if ($behind -eq $null) { $behind = 0 }
    if ($ahead -gt 0) {
        Color "  Commits on dev not on master ($ahead):`n" -Color cyan
        git log --oneline master..dev | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    }
    if ($behind -gt 0) {
        Color "`n  Commits on master not on dev ($behind):`n" -Color cyan
        git log --oneline dev..master | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    }
    if ($ahead -eq 0 -and $behind -eq 0) {
        Color "  dev and master are in sync." -Color green
    } else {
        Color "`n  dev is $ahead ahead, $behind behind master." -Color green
    }
    PauseAndBack
}

function Wizard-ChangelogPreview {
    ShowHeader
    Color "=== Unreleased changelog ===" -Color cyan
    $out = git cliff --unreleased --strip header 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $out) {
        Color "  No unreleased changes or git-cliff unavailable." -Color yellow
    } else {
        $out | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    }
    PauseAndBack
}

function Wizard-VerifyVersions {
    ShowHeader
    Color "=== Verify versions ===" -Color cyan
    $out = node scripts/verify-versions.mjs 2>&1
    $out | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
    if ($LASTEXITCODE -ne 0) {
        Color "  Versions do NOT match!" -Color red
    }
    PauseAndBack
}

function Wizard-BumpVersion {
    ShowHeader
    Color "=== Bump version ===" -Color cyan
    Color "  Current: $(GetVersionFromPackage)" -Color green
    Color "`n  Select:" -Color cyan
    Color "    [1] patch (e.g. 1.0.0 -> 1.0.1)" -Color grey
    Color "    [2] minor (e.g. 1.0.0 -> 1.1.0)" -Color grey
    Color "    [3] major (e.g. 1.0.0 -> 2.0.0)" -Color grey
    $t = Read-Host "`n  #"
    $type = switch ($t) { "1" { "patch" } "2" { "minor" } "3" { "major" } default { "" } }
    if (-not $type) { return }
    if (-not (PromptYes)) { return }
    $out = node scripts/bump-version.mjs $type 2>&1
    $out | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
    Color "  Done. Version bumped ($type)." -Color green
    PauseAndBack
}

function Wizard-ReleaseChecklist {
    ShowHeader
    $v = GetVersionFromPackage
    Color "=== Release checklist ===" -Color cyan
    Color "  Releasing version: $v`n" -Color green

    Color "  [1/6] Verifying version consistency..." -Color cyan
    $vout = node scripts/verify-versions.mjs 2>&1
    $vout | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    if ($LASTEXITCODE -ne 0) {
        Color "  Versions dont match! Run 'Bump version' first." -Color red
        PauseAndBack; return
    }
    Color "  [OK] All versions match`n" -Color green

    Color "  [2/6] Preview changelog? [y/N] " -Color yellow
    if ((Read-Host) -eq "y") {
        git cliff --unreleased --strip header 2>$null | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    }
    Color "  [OK] Changelog checked`n" -Color green

    Color "  [3/6] Push master? [y/N] " -Color yellow
    if ((Read-Host) -eq "y") {
        RunGit "push origin master" "push master"
    }
    Color "  [OK] Master pushed`n" -Color green

    Color "  [4/6] Creating tag v$v..." -Color cyan
    $existing = git tag -l "v$v"
    if ($existing) {
        Color "  Tag v$v already exists, skipping." -Color yellow
    } else {
        RunGit "tag v$v master" "create tag"
        RunGit "push origin v$v" "push tag"
    }
    Color "  [OK] Tag created`n" -Color green

    Color "  [5/6] On GitHub: create a draft release from tag v$v" -Color cyan
    Color "  [6/6] On GitHub: publish the draft to trigger builds" -Color cyan
    Color "`n  Done. Release checklist complete." -Color green
    PauseAndBack
}

# --- category sub-menus -------------------------------------------------------

function Menu-Branch {
    while ($true) {
        ShowHeader
        Color "Category: Branch Ops" -Color cyan
        Color "  [1] Reset dev -> master (force sync)" -Color green
        Color "  [2] Merge master into dev" -Color green
        Color "  [3] Cherry-pick a commit" -Color green
        Color "  [4] Create hotfix branch" -Color green
        Color "  [5] Finish and merge hotfix" -Color green
        Color ""
        Color "  [B] Back" -Color magenta
        $c = Read-Host "  Selection"
        switch ($c) {
            "1" { Wizard-SyncDevToMaster }
            "2" { Wizard-SyncMasterIntoDev }
            "3" { Wizard-CherryPick }
            "4" { Wizard-HotfixCreate }
            "5" { Wizard-HotfixFinish }
            "b" { return }; "B" { return }
            default { Color "  Invalid" -Color red; Start-Sleep -Milliseconds 400 }
        }
    }
}

function Menu-TagRelease {
    while ($true) {
        ShowHeader
        Color "Category: Tag & Release" -Color cyan
        Color "  [1] Create a tag" -Color green
        Color "  [2] Delete a tag" -Color green
        Color "  [3] Release checklist (full walkthrough)" -Color green
        Color ""
        Color "  [B] Back" -Color magenta
        $c = Read-Host "  Selection"
        switch ($c) {
            "1" { Wizard-TagCreate }
            "2" { Wizard-TagDelete }
            "3" { Wizard-ReleaseChecklist }
            "b" { return }; "B" { return }
            default { Color "  Invalid" -Color red; Start-Sleep -Milliseconds 400 }
        }
    }
}

function Menu-CommitPush {
    while ($true) {
        ShowHeader
        Color "Category: Commit & Push" -Color cyan
        Color "  [1] Push with [skip ci]" -Color green
        Color "  [2] Amend last commit -- add [skip ci]" -Color green
        Color "  [3] Amend last commit -- remove [skip ci]" -Color green
        Color ""
        Color "  [B] Back" -Color magenta
        $c = Read-Host "  Selection"
        switch ($c) {
            "1" { Wizard-PushSkipCi }
            "2" { Wizard-AmendSkipCi -Add }
            "3" { Wizard-AmendSkipCi -Add:$false }
            "b" { return }; "B" { return }
            default { Color "  Invalid" -Color red; Start-Sleep -Milliseconds 400 }
        }
    }
}

function Menu-InfoVerify {
    while ($true) {
        ShowHeader
        Color "Category: Info & Verify" -Color cyan
        Color "  [1] Show recent commits" -Color green
        Color "  [2] Show dev vs master diff" -Color green
        Color "  [3] Preview unreleased changelog" -Color green
        Color "  [4] Verify versions across configs" -Color green
        Color "  [5] Bump version (patch/minor/major)" -Color green
        Color ""
        Color "  [B] Back" -Color magenta
        $c = Read-Host "  Selection"
        switch ($c) {
            "1" { Wizard-ShowCommits }
            "2" { Wizard-ShowDiff }
            "3" { Wizard-ChangelogPreview }
            "4" { Wizard-VerifyVersions }
            "5" { Wizard-BumpVersion }
            "b" { return }; "B" { return }
            default { Color "  Invalid" -Color red; Start-Sleep -Milliseconds 400 }
        }
    }
}

# --- main menu ----------------------------------------------------------------

while ($true) {
    ShowHeader
    Color "  [1] Branch Ops" -Color green
    Color "  [2] Tag & Release" -Color green
    Color "  [3] Commit & Push" -Color green
    Color "  [4] Info & Verify" -Color green
    Color ""
    Color "  [Q] Quit" -Color magenta
    Color ""
    $c = Read-Host "  Selection"
    switch ($c) {
        "1" { Menu-Branch }
        "2" { Menu-TagRelease }
        "3" { Menu-CommitPush }
        "4" { Menu-InfoVerify }
        "q" { Color "  Goodbye!" -Color green; return }
        "Q" { Color "  Goodbye!" -Color green; return }
        default { Color "  Invalid selection" -Color red; Start-Sleep -Milliseconds 400 }
    }
}
