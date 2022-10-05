/* eslint-disable no-console */

require('colors') // https://github.com/Marak/colors.js
const { prompt } = require('enquirer') // https://github.com/enquirer/enquirer
const jetpack = require('fs-jetpack') // https://github.com/szwacz/fs-jetpack
const path = require('path') // https://nodejs.org/api/path.html
const semver = require('semver') // https://github.com/npm/node-semver
const { default: ora } = await import('ora') // https://github.com/sindresorhus/ora

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

async function createGithubRelease ({ body, isBeta, version }) {
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

// Main
async function main () {
  const { execaSync } = await import('execa') // https://github.com/sindresorhus/execa

  // Start!
  console.clear()

  console.log(
    '\n  ========================'.bold.dim.yellow +
    '\n  === ASTEROID BUILDER ==='.bold.yellow +
    '\n  ========================'.bold.dim.yellow +
    '\n'
  )

  const currentVersion = require('../package.json').version

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

  const currentBranch = execaSync('git', ['branch', '--show-current']).stdout
  const acceptableBranch = ['main', 'main-homolog']

  const changelogPath = `${packages.global.path}CHANGELOG.md`
  const resolvedChangelogPath = path.resolve(changelogPath)

  const currentChangelog = jetpack.read(resolvedChangelogPath, 'utf8')
  const hasUnreleased = currentChangelog.match(/\## Não publicado\b/g)

  if (!hasUnreleased) {
    ora(
      'Não foi possível encontrar o "## Não publicado" dentro do CHANGELOG.md por favor adicione para continuar'
    ).fail()

    return
  }

  if (!process.env.GITHUB_TOKEN) {
    ora(
      'Inicialize a variável de ambiente "GITHUB_TOKEN" no seu sistema operacional para que possa ser feita a criação de release no github'
    ).fail()

    return
  }

  const unreleasedText = '## Não publicado'
  const indexOfStart = currentChangelog.indexOf(unreleasedText)
  const indexOfEnd = currentChangelog.indexOf(`## [${currentVersion}]`)
  const changelogContent = currentChangelog.substring(indexOfStart, indexOfEnd)

  const publishedDate = new Intl.DateTimeFormat('pt-BR').format(new Date()).replace(/\//g, '-')
  const versionLinkCompare = getVersionLinkCompare(nextVersion, currentVersion)
  const replacedChangelog = currentChangelog.replace(
    unreleasedText,
    `## [${nextVersion}] - ${publishedDate}`
  ).trimEnd()

  const normalizedChangelog = (
    replacedChangelog + '\n' + versionLinkCompare
  )

  jetpack.write(resolvedChangelogPath, normalizedChangelog)

  // publicando ui
  const publishSpinner = ora('Publicando "ui"').start()

  if (!acceptableBranch.includes(currentBranch)) {
    publishSpinner.fail('Só é possível publicar nas branchs "main" e "main-homolog"')
    return
  }

  const isBeta = currentBranch === 'main-homolog'
  const publishCommands = ['publish']

  isBeta && publishCommands.push('--tag', 'beta')

  try {
    execaSync('npm', publishCommands, { cwd: packages.ui.resolved })
    publishSpinner.succeed('"ui" publicada')

    const appExtensionPackage = packages['app-extension']
    const packagePath = `${appExtensionPackage.path}package.json`
    const resolvedPackagePath = path.resolve(packagePath)
    const currentAppExtensionPackage = jetpack.read(resolvedPackagePath, 'json')  

    const nextDependencies = currentAppExtensionPackage.dependencies
    nextDependencies['automatic-release-asteroid-ui'] = nextVersion

    jetpack.write(resolvedPackagePath, {
      ...currentAppExtensionPackage,

      dependencies: nextDependencies
    })

    const installSpinner = ora('Instalando "ui" no "app-extension"').start()

    try {
      execaSync('npm', ['install'], { cwd: appExtensionPackage.resolved })
      installSpinner.succeed('Instalado "ui" no "app-extension"')

      const publishAppExtensionSpinner = ora('Publicando "app-extension"').start()

      try {
        execaSync('npm', publishCommands, { cwd: appExtensionPackage.resolved })
        publishAppExtensionSpinner.succeed('"app-extension" publicada com sucesso')
      } catch (error) {
        publishAppExtensionSpinner.fail('Falha ao publicar "app-extension"')
        throw error
      }
    } catch (error) {
      installSpinner.fail('Falha ao instalar "ui" no "app-extension')
      throw error
    }

  } catch (error) {
    publishSpinner.fail('Falha ao publicar "ui"')
    throw error
  }

  // commita as alterações
  execaSync('git', ['add', '.'], { cwd: packages.global.resolved })

  execaSync(
    'git',
    [
      'commit',
      '-m',
      `Releasing v${nextVersion}`
    ],
    { cwd: packages.global.resolved }
  )

  // gera a tag
  execaSync(
    'git',
    [
      'tag',
      `v${nextVersion}`
    ],
    { cwd: packages.global.resolved }
  )

  // envia tag para o github
  execaSync(
    'git',
    [
      'push',
      '--tag'
    ],
    { cwd: packages.global.resolved }
  )

  // envia para o github alterações
  execaSync(
    'git',
    [
      'push'
    ],
    { cwd: packages.global.resolved }
  )

  await createGithubRelease({ body: changelogContent, isBeta, version: nextVersion })
}

main()
