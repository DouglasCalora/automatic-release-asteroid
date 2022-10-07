function getLatestVersions ({ execaSync, isBeta, ora }) {
  const getNormalizedVersions = require('./get-normalized-versions')
  const getNearestVersion = require('./get-nearest-version')

  const latestVersionsSpinner = ora('Obtendo versões atualizadas no npm...').start()

  // TODO alterar nomes dos pacotes
  const appExtensionVersions = JSON.parse(execaSync('npm', ['show', 'app-extension', 'time', '--json']).stdout)
  const uiVersions = JSON.parse(execaSync('npm', ['show', 'automatic-release-asteroid-ui', 'time', '--json']).stdout)

  const normalizedAppExtensionVersions = getNormalizedVersions(appExtensionVersions, isBeta)
  const normalizedUiVersions = getNormalizedVersions(uiVersions, isBeta)
  const today = new Date()

  const versions = {
    ui: getNearestVersion(normalizedUiVersions, today),
    appExtension: getNearestVersion(normalizedAppExtensionVersions, today)
  }

  latestVersionsSpinner.succeed('Versões do npm obtidas!')
  return versions
}

module.exports = getLatestVersions
