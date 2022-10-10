function getLatestVersions ({ execaSync, isBeta, ora }) {
  const getNormalizedVersions = require('./get-normalized-versions')
  const getNearestVersion = require('./get-nearest-version')

  const latestVersionsSpinner = ora('Obtendo versões atualizadas no npm...').start()

  // TODO alterar nomes dos pacotes
  const appExtensionVersions = JSON.parse(execaSync('npm', ['show', 'app-extension', 'time', '--json']).stdout)
  const uiVersions = JSON.parse(execaSync('npm', ['show', 'automatic-release-asteroid-ui', 'time', '--json']).stdout)

  const normalizedAppExtensionVersions = getNormalizedVersions(appExtensionVersions)
  const normalizedUiVersions = getNormalizedVersions(uiVersions)
  const today = new Date()

  const versions = {
    ui: {
      stable: getNearestVersion(normalizedUiVersions.stable, today),
      beta: getNearestVersion(normalizedUiVersions.beta, today),
      latest: getNearestVersion(normalizedUiVersions.all, today)
    },
    appExtension: {
      stable: getNearestVersion(normalizedAppExtensionVersions.stable, today),
      beta: getNearestVersion(normalizedAppExtensionVersions.beta, today),
      latest: getNearestVersion(normalizedAppExtensionVersions.all, today)
    }
  }

  latestVersionsSpinner.succeed('Versões do npm obtidas!')
  return versions
}

module.exports = getLatestVersions
