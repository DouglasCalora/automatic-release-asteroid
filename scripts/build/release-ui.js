function releaseUi ({ execaSync, ora, publishCommands, packages }) {
  const publishSpinner = ora('Publicando "ui"...').start()

  try {
    execaSync('npm', publishCommands, { cwd: packages.ui.resolved })
    publishSpinner.succeed('"ui" publicada')

    return { success: true, error: false }
  } catch (error) {
    publishSpinner.fail('Falha ao publicar "ui"')
    throw { success: false, error: true }
  }
}

module.exports = releaseUi
