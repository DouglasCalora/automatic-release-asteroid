function releaseAppExtension ({ execaSync, ora, nextVersion, publishCommands, packages }) {
  const installNextUi = require('./install-next-ui')

  const { error } = installNextUi({ execaSync, ora, nextVersion, packages })
  console.log("🚀 ~ file: release-app-extension.js ~ line 5 ~ releaseAppExtension ~ error", error)

  if (error) {
    return { success: false, error: true }
  }

  try {
    // publica a nova versão do "app-extension"
    execaSync('npm', publishCommands, { cwd: packages['app-extension'].resolved })
    publishAppExtensionSpinner.succeed('"app-extension" publicada com sucesso')

    return { success: true, error: false }
  } catch (error) {
    publishAppExtensionSpinner.fail('Falha ao publicar "app-extension"')
    return { success: false, error: true }
  }
}

module.exports = releaseAppExtension
