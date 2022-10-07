const jetpack = require('fs-jetpack') // https://github.com/szwacz/fs-jetpack
const path = require('path') // https://nodejs.org/api/path.html

function changelogHandler ({ ora, nextVersion, currentVersion, packages }) {
  const getVersionLinkCompare = require('./get-version-link-compare')

  const changelogPath = `${packages.global.path}CHANGELOG.md`
  const resolvedChangelogPath = path.resolve(changelogPath)

  const currentChangelog = jetpack.read(resolvedChangelogPath, 'utf8')

  const unreleasedText = '## Não publicado'

  return {
    hasUnreleased: currentChangelog.match(/\## Não publicado\b/g),

    getContent () {
      const indexOfStart = currentChangelog.indexOf(unreleasedText) + unreleasedText.length
      
      /*
      * Regex para encontrar o primeiro resultados que respeitam
      * ## [1.1.0] sendo que os números na versão podem ser qualquer numero, ou
      * ## [1.1.0-beta.0] sendo que os números na versão podem ser qualquer numero
      */
      const indexOfEnd2 = currentChangelog.search(
        `\#\# ([[0-9]+[\.]?[0-9]+[\.]?[0-9]+\])|(\[[0-9]+[\.]?[0-9]+[\.]?[0-9]+[\-]beta[\.][0-9]+\])`,
        'm'
      )

      const hasIndexRange = (indexOfEnd2 >= 0 && indexOfStart >= 0)

      if (!hasIndexRange) {
        return (
          'Para saber mais sobre as alterações acesse: https://github.com/bildvitta/asteroid/blob/main/CHANGELOG.md'
        )
      }

      const content = currentChangelog.substring(indexOfStart, indexOfEnd2)

      return content.trimEnd().endsWith('##') ? content.substring(0, content.length - 3) : content
    },

    update () {
      const updateChangelogSpinner = ora('Atualizando "CHANGELOG.md"...').start()

      try {
        const publishedDate = new Intl.DateTimeFormat('pt-BR').format(new Date()).replace(/\//g, '-')

        const replacedChangelog = currentChangelog.replace(
          unreleasedText,
          `## [${nextVersion}] - ${publishedDate}`
        ).trimEnd()
  
        const versionLinkCompare = getVersionLinkCompare(nextVersion, currentVersion)
  
        const normalizedChangelog = (
          replacedChangelog + '\n' + versionLinkCompare
        )
  
        jetpack.write(resolvedChangelogPath, normalizedChangelog)

        updateChangelogSpinner.succeed('"CHANGELOG.md" foi atualizado com sucesso!')
      } catch {
        updateChangelogSpinner.fail('Falha ao atualizar "CHANGELOG.md".')
      }
    }
  }
}

module.exports = changelogHandler
