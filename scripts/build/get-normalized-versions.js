function getNormalizedVersions (versions = {}, isBeta) {
  const normalizedVersion = {}
  const nonAcceptableKey = ['created', 'modified']

  for (const key in versions) {
    if (nonAcceptableKey.includes(key)) continue

    if (isBeta && key.includes('-beta')) {
      normalizedVersion[key] = versions[key]
      continue
    }

    if (!isBeta && !key.includes('-beta')) {
      normalizedVersion[key] = versions[key]
    }
  }

  return normalizedVersion
}

module.exports = getNormalizedVersions
