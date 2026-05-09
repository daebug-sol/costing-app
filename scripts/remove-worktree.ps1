#Requires -Version 5.1
<#
.SYNOPSIS
  Remove a worktree by folder path. Use --force if the tree has uncommitted changes you want dropped.

.EXAMPLE
  .\scripts\remove-worktree.ps1 -Path "D:\dae-app-projects\costing-worktrees\feature-ahu-panel"
  .\scripts\remove-worktree.ps1 -Path "..." -Force
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string] $Path,

  [switch] $Force
)

$ErrorActionPreference = "Stop"
$repoRoot = (git -C $PSScriptRoot/.. rev-parse --show-toplevel 2>$null)
if (-not $repoRoot) { throw "Could not find git repo." }
$Path = (Resolve-Path -LiteralPath $Path).Path
$arg = if ($Force) { @("worktree", "remove", "--force", $Path) } else { @("worktree", "remove", $Path) }
Write-Host "git -C (repo) $($arg -join ' ')"
& git -C $repoRoot @arg
exit $LASTEXITCODE
