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
    ora.fail('S?? ?? poss??vel publicar nas branchs "main" e "main-homolog"')
    return
  }

  const latestVersions = getLatestVersions({ execaSync, ora, isBeta })
  console.log("???? ~ file: build.js ~ line 76 ~ main ~ latestVersions", latestVersions)
  const model = isBeta ? 'beta' : 'stable'

  let currentVersion = require('../package.json').version

  const responses = await prompt({
    name: 'nextVersion',
    type: 'input',
    message: 'Qual ser?? o n??mero da pr??xima vers??o?',
    initial: currentVersion,

    validate (value) {
      value = semver.clean(value)

      if (!value || semver.lt(value, currentVersion)) {
        return logError('\n??? Informe uma vers??o v??lida e superior a atual.')
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

    const packageSpinner = ora(`Alterando vers??o em "${packagePath}"...`).start()
    const currentPackage = jetpack.read(resolvedPackagePath, 'json')

    jetpack.write(resolvedPackagePath, {
      ...currentPackage,
      ...packageCore,

      version: nextVersion
    })

    packageSpinner.succeed(`Vers??o alterada em "${packagePath}".`)

    // Install dependencies
    const installSpinner = ora(`Instalando depend??ncias em "${packageName}"...`).start()
    execaSync('npm', ['install'], { cwd: packageData.resolved })
    installSpinner.succeed(`Depend??ncias instaladas em "${packageName}".`)
  }

  // ----------------------- A partir daqui tudo ?? referente a publica????o do asteroid -----------------------
  const {
    hasUnreleased,
    update,
    getContent
  } = changelogHandler({
    ora,
    nextVersion,
    isBeta,
    packages,
    latestVersions
  })

  if (!hasUnreleased) {
    ora(
      'N??o foi poss??vel encontrar o "## N??o publicado" dentro do CHANGELOG.md por favor adicione para continuar'
    ).fail()

    return
  }

  const changelogContent = getContent()
  const publishCommands = ['publish']
  isBeta && publishCommands.push('--tag', 'beta')

  // Se a proxima vers??o for diferente da ultima vers??o publicada, ent??o significa que podemos lan??ar uma nova vers??o do ui
  if (nextVersion !== latestVersions.ui[model]) {
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
  // if (process.env.DISCORD_WEBHOOK_CHANGELOG) {
  //   notifyDiscordChat({
  //     changelogContent,
  //     ora,
  //     nextVersion,
  //     isBeta,
  //     hasGithubRelease: !!process.env.GITHUB_TOKEN && createdReleaseFromAPI
  //   })
  // }
}

main()
