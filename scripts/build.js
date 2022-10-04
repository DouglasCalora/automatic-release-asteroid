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
    // execaSync('npm', ['install'], { cwd: packageData.resolved })
    installSpinner.succeed(`Dependências instaladas em "${packageName}".`)
  }

  // publicando ui
  const publishSpinner = ora('Publicando "ui"').start()

  try {
    // execaSync('npm', ['publish'], { cwd: package.resolved })
    publishSpinner.succeed('"ui" publicada')

    const appExtensionPackage = packages['app-extension']
    const packagePath = `${appExtensionPackage.path}package.json`
    const resolvedPackagePath = path.resolve(packagePath)
    const currentPackage = jetpack.read(resolvedPackagePath, 'json')
    const nextVersion = semver.clean(responses.nextVersion)

    const nextDependencies = currentPackage.dependencies
    nextDependencies.ui = nextVersion

    jetpack.write(resolvedPackagePath, {
      ...currentPackage,

      dependencies: nextDependencies
    })

    const installSpinner = ora('Instalando "ui" no "app-extension"').start()

    execaSync('git', ['init'], { cwd: appExtensionPackage.resolved })

    try {
      // execaSync('npm', ['install'], { cwd: appExtensionPackage.resolved })
      installSpinner.succeed('Instalado "ui" no "app-extension"')

      const publishAppExtensionSpinner = ora('Publicando "app-extension"').start()

      try {
        // execaSync('npm', ['publish'], { cwd: appExtensionPackage.resolved })
        publishAppExtensionSpinner.succeed('"app-extension" publicada com sucesso')
      } catch (error) {
        publishAppExtensionSpinner.fail('Falha ao publicar "app-extension"')
        throw error
      }
    } catch (error) {
      installSpinner.fail('Falha ao instalar "ui" no "app-extension')
      throw error
    }

    // Object.assign()
    console.log("🚀 ~ file: build.js ~ line 113 ~ main ~ resolvedPackagePath", nextDependencies.ui)


  } catch (error) {
    publishSpinner.fail('Falha ao publicar "ui"')
    throw error
  }


  execaSync('git', ['add', '.'], { cwd: packages.global.resolved })
  execaSync('git', ['commit', '-m', `Releasing v${nextVersion}`], { cwd: packages.global.resolved })
}

main()
