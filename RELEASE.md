# Releasing

Releases are cut by CI on a version tag. The workflow (`.github/workflows/release.yml`)
builds the direct-download channel for macOS, Windows, and Linux, signs and
notarizes the macOS build, generates the third-party notices, and publishes a
GitHub Release with the electron-updater manifests attached.

Store packages (Mac App Store `.pkg`, Snap, Microsoft Store `.appx`) are built by
the same run, but they are attached to the **run artifacts**, not to the release
page — none of them installs for anyone outside its store, so on a release page
they would only collect confused downloads. Submitting them stays local: see
[Store submissions](#store-submissions).

Each store build is best-effort. A missing secret or a store-only signing problem
leaves that package out and does not hold up the direct-download release.

## Cutting a release

1. Bump `version` in `package.json`.
2. In `CHANGELOG.podlite`, change the top container's `:released-in<upcoming>` to
   `:released-in<version>` and its `=head2 Upcoming` to `=head2 <version> — <date>`,
   then add a fresh empty `upcoming` container above it for the next cycle.
   For a release worth more than a changelog section, copy
   `release-notes/TEMPLATE.podlite` to `release-notes/v<version>.podlite` and write
   the highlights — the workflow prefers it and pulls the section in via `=include`.
3. For images in the notes, put them in `release-notes/assets/v<version>/` and link
   them at `https://github.com/podlite/podlite-desktop/releases/download/v<version>/<file>`.
   The workflow uploads everything from that folder as assets of the same release,
   so the links resolve once it is published and nothing lands in the repo tree.
4. Commit both.
5. Tag and push:

   ```
   git tag v<version>
   git push origin v<version>
   ```

The tag push starts the workflow. It verifies the tag matches `package.json`,
builds each OS into a draft release, and sets the notes from the changelog section.

6. **The release stays a draft.** Check the assets, install the build, then publish:

   ```
   gh release edit v<version> --draft=false --latest
   ```

   A draft is not served to installed apps: the update manifests sit behind the
   same visibility as the release, so nothing ships until this command runs. The
   workflow prints it in the run summary.

A suffixed version (`0.9.0-alpha.1`, `-beta`, `-rc`) is published as a
prerelease — it is not marked Latest, so clients polling `/releases/latest` do not
pull it. Use one for the first end-to-end test:

```
# package.json version = 0.9.0-alpha.1
git tag v0.9.0-alpha.1 && git push origin v0.9.0-alpha.1
```

## Store submissions

The release run leaves the store packages in its artifacts. To fetch and submit
them:

```
yarn release:stores 0.9.0     # defaults to the version in package.json
yarn release:stores --dry-run # show what would happen
```

The script finds the run for the tag, downloads whichever store artifacts exist
into `release-stores/v<version>/`, uploads the snap to the Snap Store, and prints
what is left: Transporter for the Mac App Store package, Partner Center for the
AppX. Store credentials stay on this machine.

When a store package is missing from the run, build it locally instead:
`yarn release:mas`, `yarn release:appx`, `yarn release:snap`.

## Security releases

A release that closes a vulnerability ships two sets of notes, not one:

- **On the release page at publish time** — a short line, no detail:
  "Security and stability update." The same wording goes into the store listings.
- **Three to five days later**, once the update has reached the stores and most
  installs — the full list of what was fixed, edited into the same release.

Keep the detailed text in `release-notes/v<version>-detail.md` until then. While
most people are still on the vulnerable build, a precise list of what was wrong is
a set of instructions for whoever wants to use it.

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
| `MAS_CERTS` | base64 of the Mac App Store `.p12` — Apple Distribution plus 3rd Party Mac Developer Installer |
| `MAS_CERTS_PASSWORD` | password for that `.p12` |
| `MAS_PROVISION_PROFILE` | base64 of `podlite_mac_store.provisionprofile`; the file itself is kept out of the tree by `.gitignore`, so the run writes it from here |
| `WINDOWS_CERTS`, `WINDOWS_CERTS_PASSWORD` | Windows code-signing cert — not wired in yet; Windows ships unsigned until a current cert is added |

The Mac App Store secrets are a different pair from `MAC_CERTS`: that one signs the
direct download, these sign the store build. Both are needed, neither replaces the
other. The profile expires — check its date before a release:

```
security cms -D -i assets/podlite_mac_store.provisionprofile | grep -A1 ExpirationDate
```

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
