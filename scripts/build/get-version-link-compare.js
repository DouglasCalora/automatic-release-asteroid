function getVersionLinkCompare (nextVersion, currentVersion) {
  return (
    `[${nextVersion}]: https://github.com/bildvitta/asteroid/compare/v${currentVersion}...v${nextVersion}?expand=1`
  )
}

module.exports = getVersionLinkCompare
