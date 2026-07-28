# Releasing

Releases are cut by CI on a version tag. The workflow (`.github/workflows/release.yml`)
builds the direct-download channel for macOS, Windows, and Linux, signs and
notarizes the macOS build, generates the third-party notices, and publishes a
GitHub Release with the electron-updater manifests attached.

Store submissions (Mac App Store, Microsoft Store, Snap) are **not** part of CI —
they stay on the local scripts (`yarn release:mas`, `yarn release:appx`,
`yarn release:snap`, `yarn release:ship`).

## Cutting a release

1. Bump `version` in `package.json`.
2. In `CHANGELOG.md`, rename the `# upcoming` heading to `# <version> — <date>`
   and add a fresh empty `# upcoming` on top for the next cycle.
3. Commit both.
4. Tag and push:

   ```
   git tag v<version>
   git push origin v<version>
   ```

The tag push starts the workflow. It verifies the tag matches `package.json`,
builds each OS, publishes into a draft release, sets the notes from the changelog
section, and publishes.

A suffixed version (`0.9.0-alpha.1`, `-beta`, `-rc`) is published as a
prerelease — it is not marked Latest, so clients polling `/releases/latest` do not
pull it. Use one for the first end-to-end test:

```
# package.json version = 0.9.0-alpha.1
git tag v0.9.0-alpha.1 && git push origin v0.9.0-alpha.1
```

## Rollback

Delete the release and tag, fix, retag:

```
gh release delete v<version> --yes
git push --delete origin v<version>
git tag -d v<version>
```

## Runners

Two jobs: `build-mac` (macOS — signs and notarizes the mac build and cross-builds
the unsigned Windows installer) and `build-linux` (Linux — the AppImage).
`runs-on` reads a repo variable, so each can flip to a self-hosted machine without
editing the workflow (Settings → Actions → Variables).

This is a public repo, so GitHub-hosted runners are free and unlimited — the
defaults need nothing set up.

| Variable | Unset (default) | Self-hosted example |
|----------|-----------------|---------------------|
| `MACOS_RUNNER` | `macos-latest`  | `["self-hosted","macOS","ARM64"]` |
| `LINUX_RUNNER` | `ubuntu-latest` | `["self-hosted","Linux","X64"]`   |

## Secrets

Set in Settings → Secrets → Actions. macOS signing uses the same Apple account as
the local build.

| Secret | Purpose |
|--------|---------|
| `MAC_CERTS` | base64 of the Developer ID Application `.p12` |
| `MAC_CERTS_PASSWORD` | password for that `.p12` |
| `API_KEY` | App Store Connect API key (`.p8` contents), used for notarization |
| `API_KEY_ID` | API key id |
| `API_KEY_ISSUER_ID` | API key issuer id |
| `WINDOWS_CERTS`, `WINDOWS_CERTS_PASSWORD` | Windows code-signing cert — not wired in yet; Windows ships unsigned until a current cert is added |

`GITHUB_TOKEN` is provided automatically and is enough to publish releases in this
repo.

## Notes on the Windows build

The Windows installer is cross-built on the macOS runner (`--win nsis zip --x64`).
electron-builder needs no Wine on macOS to build Windows targets (Wine is only
required for that on Linux), so no dedicated Windows runner is needed. It is
unsigned for now: fresh installs show a SmartScreen prompt, and electron-updater
may reject the unsigned package on auto-update. The Windows step is best-effort — a
failure there does not block the macOS and Linux release. To sign later, add a
code-signing cert and enable electron-builder's Windows signing.
