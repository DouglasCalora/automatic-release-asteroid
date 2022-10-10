function getVersionLinkCompare ({ nextVersion, latestVersions, isBeta }) {
  const currentVersion = isBeta ? latestVersions.appExtension.latest : latestVersions.appExtension.stable
  console.log("🚀 ~ file: get-version-link-compare.js ~ line 3 ~ getVersionLinkCompare ~ currentVersion", currentVersion)

  return (
    `[${nextVersion}]: https://github.com/bildvitta/asteroid/compare/v${currentVersion}...v${nextVersion}?expand=1`
  )
}

module.exports = getVersionLinkCompare
