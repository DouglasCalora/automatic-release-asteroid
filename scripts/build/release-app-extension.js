function releaseAppExtension ({ execaSync, ora, nextVersion, publishCommands, packages }) {
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

module.exports = releaseAppExtension