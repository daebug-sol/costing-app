#Requires -Version 5.1
<#
.SYNOPSIS
  Add a git worktree under ../costing-worktrees/ (sibling of repo parent) for feature work.

.EXAMPLE
  .\scripts\new-worktree.ps1 -Name "AHU panel"
  .\scripts\new-worktree.ps1 -Branch "feature/quotation" -Base "master"
#>
[CmdletBinding(DefaultParameterSetName = "NewFeature")]
param(
  [Parameter(ParameterSetName = "NewFeature", Mandatory = $true)]
  [string] $Name,

  [Parameter(ParameterSetName = "ExistingBranch", Mandatory = $true)]
  [string] $Branch,

  [string] $Base = "master"
)

$ErrorActionPreference = "Stop"

$repoRoot = (git -C $PSScriptRoot/.. rev-parse --show-toplevel 2>$null)
if (-not $repoRoot) { throw "Could not find git repo (run from costing-app or use full path to scripts/)." }
$repoRoot = (Resolve-Path $repoRoot).Path

$parent = Split-Path $repoRoot -Parent
$worktreesRoot = Join-Path $parent "costing-worktrees"
if (-not (Test-Path $worktreesRoot)) { New-Item -ItemType Directory -Path $worktreesRoot | Out-Null }

function Get-SafeSlug {
  param([string] $s)
  $slug = ($s -replace '[^\p{L}\p{N}._-]+', '-')
  $slug = $slug -replace '-{2,}', '-'
  $slug = $slug.Trim('-')
  if (-not $slug) { $slug = "worktree" }
  return $slug
}

$gitArgs = @("worktree", "add")
if ($PSCmdlet.ParameterSetName -eq "NewFeature") {
  $slug = Get-SafeSlug $Name
  if ($slug -ne $Name -and $Name.Trim()) { Write-Host "Folder/branch slug: $slug" }
  $newBranch = "feature/$slug"
  $path = Join-Path $worktreesRoot "feature-$slug"
  if (Test-Path $path) { throw "Path already exists: $path" }
  Write-Host "Creating worktree at $path branch $newBranch from $Base ..."
  & git -C $repoRoot @gitArgs $path -b $newBranch $Base
} else {
  if ($Branch -notmatch '^[a-zA-Z0-9/._-]+$') { throw "Refuse branch with odd characters: $Branch" }
  $slug = Get-SafeSlug ($Branch -replace '/','-')
  $path = Join-Path $worktreesRoot $slug
  if (Test-Path $path) { throw "Path already exists: $path" }
  Write-Host "Creating worktree at $path for existing branch $Branch ..."
  & git -C $repoRoot @gitArgs $path $Branch
}

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Next: cd '$path' ; npm install  (and copy .env* from main clone if needed)"
Write-Host "Cursor: File -> Open Folder -> $path"
Write-Host "List: git -C '$repoRoot' worktree list"
