function installNextUi ({ execaSync, ora, nextVersion, packages, retry = false }) {
  const jetpack = require('fs-jetpack') // https://github.com/szwacz/fs-jetpack
  const getAppExtensionPackage = require('./get-app-extension-package')

  const installSpinner = ora('Instalando "ui" no "app-extension"...').start()

  try {
    // recupera o package.json do app-extension
    const { packageData, resolvedPackagePath } = getAppExtensionPackage(packages)

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

    return { success: true, error: false }
  } catch (error) {
    if (retry) {
      installSpinner.fail('Falha ao instalar "ui" no "app-extension')
      return { success: false, error: true }
    }

    execaSync('rm', ['-rf', 'node_modules'], { cwd: packages['app-extension'].resolved })
    execaSync('rm', ['-rf', 'package-lock.json'], { cwd: packages['app-extension'].resolved })

    installNextUi({ execaSync, ora, nextVersion, packages, retry: true })
  }
}

module.exports = installNextUi
