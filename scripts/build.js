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

// Main
async function main () {
  const { execaSync } = await import('execa') // https://github.com/sindresorhus/execa
  const { default: ora } = await import('ora') // https://github.com/sindresorhus/ora

  const notifyDiscordChat = require('./build/notify-discord-chat')
  const createGithubRelease = require('./build/create-github-release')
  const getLatestVersions = require('./build/get-latest-versions')
  const changelogHandler = require('./build/changelog-handler')
  const releaseAppExtension = require('./build/release-app-extension')
  const releaseUi = require('./build/release-ui')
  const createGithubReleaseFromBrowser = require('./build/create-github-release-from-browser')
  const gitHandler = require('./build/git-handler')

  // Start!
  console.clear()

  console.log(
    '\n  ========================'.bold.dim.yellow +
    '\n  === ASTEROID BUILDER ==='.bold.yellow +
    '\n  ========================'.bold.dim.yellow +
    '\n'
  )

  const currentBranch = execaSync('git', ['branch', '--show-current']).stdout
  const acceptableBranch = ['main', 'main-homolog']
  const isBeta = currentBranch === 'main-homolog'

  if (!acceptableBranch.includes(currentBranch)) {
    ora.fail('Só é possível publicar nas branchs "main" e "main-homolog"')
    return
  }

  const latestVersions = getLatestVersions({ execaSync, ora, isBeta })

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
  const {
    hasUnreleased,
    update,
    getContent
  } = changelogHandler({
    ora,
    nextVersion,
    currentVersion,
    isBeta,
    packages
  })

  if (!hasUnreleased) {
    ora(
      'Não foi possível encontrar o "## Não publicado" dentro do CHANGELOG.md por favor adicione para continuar'
    ).fail()

    return
  }

  const changelogContent = getContent()
  const publishCommands = ['publish']
  isBeta && publishCommands.push('--tag', 'beta')

  if (nextVersion !== latestVersions.ui) {
    const { error: uiError } = releaseUi({
      execaSync,
      ora,
      nextVersion,
      publishCommands,
      packages
    })

    if (uiError) return
  }

  const { error: appExtensionError } = releaseAppExtension({
    execaSync,
    ora,
    nextVersion,
    publishCommands,
    packages
  })

  if (appExtensionError) return

  // atualiza o CHANGELOG.md
  update()

  // commita,faz o push, cria tag e faz push da tag
  gitHandler({
    ora,
    execaSync,
    nextVersion,
    isBeta,
    packages
  })

  let createdReleaseFromAPI = false

  if (process.env.GITHUB_TOKEN) {
    const { success } = await createGithubRelease({
      body: changelogContent,
      isBeta,
      ora,
      version: nextVersion,
    })

    createdReleaseFromAPI = success
  } else {
    createGithubReleaseFromBrowser({
      changelogContent,
      nextVersion,
      ora
    })
  }

  // TODO Voltar
  // notifyDiscordChat({
  //   changelogContent,
  //   ora,
  //   nextVersion,
  //   isBeta,
  //   hasGithubRelease: !!process.env.GITHUB_TOKEN && createdReleaseFromAPI
  // })
}

main()
