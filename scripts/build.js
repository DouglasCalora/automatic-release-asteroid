/* eslint-disable no-console */

require('colors') // https://github.com/Marak/colors.js
const { prompt } = require('enquirer') // https://github.com/enquirer/enquirer
const jetpack = require('fs-jetpack') // https://github.com/szwacz/fs-jetpack
const path = require('path') // https://nodejs.org/api/path.html
const semver = require('semver') // https://github.com/npm/node-semver

// Options
const packages = {
  global: {
    path: './',
    resolved: path.resolve('./')
  },

  'app-extension': {
    path: 'app-extension/',
    resolved: path.resolve('app-extension/')
  },

  docs: {
    path: 'docs/',
    resolved: path.resolve('docs/')
  },

  ui: {
    path: 'ui/',
    resolved: path.resolve('ui/')
  }
}

const packageCore = {
  author: 'Bild & Vitta <systemteam@bild.com.br>',
  license: 'MIT'
}

// Methods
function logError (error) {
  return console.error(error.red)
}

function getVersionLinkCompare (nextVersion, currentVersion) {
  return (
    `[${nextVersion}]: https://github.com/bildvitta/asteroid/compare/v${currentVersion}...v${nextVersion}?expand=1`
  )
}

async function createGithubRelease ({ body, isBeta, version, ora }) {
  const { Octokit } = require("@octokit/rest")

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  })

  const versionTag = `v${version}`

  const publishReleaseSpinner = ora('Publicando release no github...').start()

  try {
    await octokit.request('POST /repos/douglascalora/automatic-release-asteroid/releases', {
      owner: 'douglascalora', // TODO alterar
      repo: 'automatic-release-asteroid', // TODO alterar
      tag_name: versionTag,
      target_commitish: isBeta ? 'main-homolog' : 'main',
      name: versionTag,
      body,
      draft: false,
      prerelease: isBeta,
      generate_release_notes: false
    })

    publishReleaseSpinner.succeed('Publicado release no github com sucesso!')
  } catch (error) {
    publishReleaseSpinner.fail('Falha ao publicar release no github.')
    throw error
  }
}

function getAppExtensionPackage () {
  // recupera o package.json
  const appExtensionPackage = packages['app-extension']
  const packagePath = `${appExtensionPackage.path}package.json`
  const resolvedPackagePath = path.resolve(packagePath)

  return {
    packageData: jetpack.read(resolvedPackagePath, 'json'),
    resolvedPackagePath
  }
}

function changelogHandler ({ ora, nextVersion, currentVersion }) {
  const changelogPath = `${packages.global.path}CHANGELOG.md`
  const resolvedChangelogPath = path.resolve(changelogPath)

  const currentChangelog = jetpack.read(resolvedChangelogPath, 'utf8')

  const unreleasedText = '## Não publicado'

  return {
    hasUnreleased: currentChangelog.match(/\## Não publicado\b/g),

    getContent () {
      const indexOfStart = currentChangelog.indexOf(unreleasedText) + unreleasedText.length
      const indexOfEnd = currentChangelog.indexOf(`## [${currentVersion}]`)

      const hasIndexRange = (indexOfEnd >= 0 && indexOfStart >= 0)

      if (!hasIndexRange) {
        return (
          'Para saber mais sobre as alterações acesse: https://github.com/bildvitta/asteroid/blob/main/CHANGELOG.md'
        )
      }

      const content = currentChangelog.substring(indexOfStart, indexOfEnd)

      return content
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

function getNearestVersion (dates, target) {
  if (!target) target = Date.now()

  else if (target instanceof Date) target = target.getTime()

  var nearest = Infinity
  var winner = -1

  for (const key in dates) {
    let date = new Date(dates[key])

    if (date instanceof Date) {
      date = date.getTime()
    }

    const distance = Math.abs(date - target)

    if (distance < nearest) {
      nearest = distance
      winner = key
    }
  }

  return winner
}

function getNormalizeVersions (versions = {}, isBeta) {
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

function getLatestVersions ({ execaSync, isBeta, ora }) {
  const latestVersionsSpinner = ora('Obtendo versões atualizadas no npm...').start()

  // TODO alterar nomes dos pacotes
  const appExtensionVersions = JSON.parse(execaSync('npm', ['show', 'app-extension', 'time', '--json']).stdout) 
  const uiVersions = JSON.parse(execaSync('npm', ['show', 'automatic-release-asteroid-ui', 'time', '--json']).stdout)

  const normalizedAppExtensionVersions = getNormalizeVersions(appExtensionVersions, isBeta)
  const normalizedUiVersions = getNormalizeVersions(uiVersions, isBeta)
  const today = new Date()

  const versions = {
    ui: getNearestVersion(normalizedUiVersions, today),
    appExtension: getNearestVersion(normalizedAppExtensionVersions, today)
  }

  latestVersionsSpinner.succeed('Versões do npm obtidas!')
  return versions
}

function releaseAppExtension ({ execaSync, ora, nextVersion, publishCommands }) {
  const installSpinner = ora('Instalando "ui" no "app-extension"').start()

  try {
    // recupera o package.json do app-extension
    const { packageData, resolvedPackagePath } = getAppExtensionPackage()

    // atualiza o package.json do app-extension com a nova versão do "ui"
    const nextDependencies = packageData.dependencies
    nextDependencies['automatic-release-asteroid-ui'] = nextVersion // TODO alterar

    jetpack.write(resolvedPackagePath, {
      ...packageData,

      dependencies: nextDependencies
    })

    // instala a nova versão do "ui"
    execaSync('npm', ['install'], { cwd: packages['app-extension'].resolved })
    installSpinner.succeed('Instalado "ui" no "app-extension"')

    const publishAppExtensionSpinner = ora('Publicando "app-extension"').start()

    try {
      // publica a nova versão do "app-extension"
      execaSync('npm', publishCommands, { cwd: packages['app-extension'].resolved })
      publishAppExtensionSpinner.succeed('"app-extension" publicada com sucesso')
    } catch (error) {
      publishAppExtensionSpinner.fail('Falha ao publicar "app-extension"')
      throw error
    }
  } catch (error) {
    installSpinner.fail('Falha ao instalar "ui" no "app-extension')
    throw error
  }
}

function releaseUi ({ execaSync, ora, nextVersion, publishCommands }) {
  const publishSpinner = ora('Publicando "ui"...').start()

  try {
    execaSync('npm', publishCommands, { cwd: packages.ui.resolved })
    publishSpinner.succeed('"ui" publicada')

    releaseAppExtension({
      execaSync,
      ora,
      nextVersion,
      publishCommands
    })
  } catch (error) {
    publishSpinner.fail('Falha ao publicar "ui"')
    throw error
  }
}
// Main
async function main () {
  const { execaSync } = await import('execa') // https://github.com/sindresorhus/execa
  const { default: ora } = await import('ora') // https://github.com/sindresorhus/ora

  // Start!
  console.clear()

  console.log(
    '\n  ========================'.bold.dim.yellow +
    '\n  === ASTEROID BUILDER ==='.bold.yellow +
    '\n  ========================'.bold.dim.yellow +
    '\n'
  )

  const latestVersions = getLatestVersions({ execaSync, ora })

  let currentVersion = require('../package.json').version

  const responses = await prompt({
    name: 'nextVersion',
    type: 'input',
    message: 'Qual será o número da próxima versão?',
    initial: currentVersion,

    validate (value) {
      value = semver.clean(value)

      if (!value || semver.lt(value, currentVersion)) {
        return logError('\n✘ Informe uma versão válida e superior a atual.')
      }

      return true
    }
  })

  const nextVersion = semver.clean(responses.nextVersion)

  /*
  * caso a versão atual do JSON seja menor do que a ultima versão publicada no NPM
  * então a versão atual deve ser a ultima versão publicada no npm
  */
  for (const key in latestVersions) {
    const latestVersion = latestVersions[key]

    if (latestVersion < currentVersion) {
      currentVersion = latestVersion
    }
  }

  for (const packageName in packages) {
    const packageData = packages[packageName]

    // Update package.json
    const packagePath = `${packageData.path}package.json`
    const resolvedPackagePath = path.resolve(packagePath)

    const packageSpinner = ora(`Alterando versão em "${packagePath}"...`).start()
    const currentPackage = jetpack.read(resolvedPackagePath, 'json')

    jetpack.write(resolvedPackagePath, {
      ...currentPackage,
      ...packageCore,

      version: nextVersion
    })

    packageSpinner.succeed(`Versão alterada em "${packagePath}".`)

    // Install dependencies
    const installSpinner = ora(`Instalando dependências em "${packageName}"...`).start()
    execaSync('npm', ['install'], { cwd: packageData.resolved })
    installSpinner.succeed(`Dependências instaladas em "${packageName}".`)
  }

  // ----------------------- A partir daqui tudo é referente a publicação do asteroid -----------------------

  if (!process.env.GITHUB_TOKEN) {
    ora(
      'Inicialize a variável de ambiente "GITHUB_TOKEN" no seu sistema operacional para que possa ser feita a criação de release no github'
    ).fail()

    return
  }

  const currentBranch = execaSync('git', ['branch', '--show-current']).stdout
  const acceptableBranch = ['main', 'main-homolog']

  if (!acceptableBranch.includes(currentBranch)) {
    ora.fail('Só é possível publicar nas branchs "main" e "main-homolog"')
    return
  }

  const { hasUnreleased, update, getContent } = changelogHandler({ ora, nextVersion, currentVersion })

  if (!hasUnreleased) {
    ora(
      'Não foi possível encontrar o "## Não publicado" dentro do CHANGELOG.md por favor adicione para continuar'
    ).fail()

    return
  }

  const isBeta = currentBranch === 'main-homolog'
  const publishCommands = ['publish']

  isBeta && publishCommands.push('--tag', 'beta')

  if (nextVersion !== latestVersions.ui) {
    releaseUi({
      execaSync,
      ora,
      nextVersion,
      publishCommands
    })
  } else {
    releaseAppExtension({
      execaSync,
      ora,
      nextVersion,
      publishCommands
    })
  }

  // atualiza o CHANGELOG.md
  update()

  // commita as alterações
  execaSync('git', ['add', '.'], { cwd: packages.global.resolved })
  execaSync('git', ['commit', '-m', `Releasing v${nextVersion}`], { cwd: packages.global.resolved })

  // gera a tag
  execaSync('git', ['tag', `v${nextVersion}`], { cwd: packages.global.resolved })

  // envia tag para o github
  execaSync('git', ['push', '--tag'], { cwd: packages.global.resolved })

  // envia as alterações para o github
  execaSync('git', ['push'], { cwd: packages.global.resolved })

  // cria release no github
  createGithubRelease({
    body: getContent(),
    isBeta,
    ora,
    version: nextVersion,
  })
}

main()
