function releaseUi ({ execaSync, ora, nextVersion, publishCommands, packages }) {
  // const releaseAppExtension = require('./release-app-extension')

  const publishSpinner = ora('Publicando "ui"...').start()

  try {
    execaSync('npm', publishCommands, { cwd: packages.ui.resolved })
    publishSpinner.succeed('"ui" publicada')

    // releaseAppExtension({
    //   execaSync,
    //   ora,
    //   nextVersion,
    //   publishCommands,
    //   packages
    // })

    return { success: true, error: false }
  } catch (error) {
    publishSpinner.fail('Falha ao publicar "ui"')
    throw { success: false, error: true }
  }
}

module.exports = releaseUi
