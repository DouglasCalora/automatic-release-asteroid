function releaseUi ({ execaSync, ora, nextVersion, publishCommands, packages }) {
  const releaseAppExtension = require('./release-app-extension')

  const publishSpinner = ora('Publicando "ui"...').start()

  try {
    execaSync('npm', publishCommands, { cwd: packages.ui.resolved })
    publishSpinner.succeed('"ui" publicada')

    releaseAppExtension({
      execaSync,
      ora,
      nextVersion,
      publishCommands,
      packages
    })

  } catch (error) {
    publishSpinner.fail('Falha ao publicar "ui"')
    throw error
  }
}

module.exports = releaseUi