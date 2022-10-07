async function notifyDiscordChat ({ changelogContent, ora, nextVersion, isBeta, hasGithubRelease }) {
  console.log("🚀 ~ file: notify-discord-chat.js ~ line 2 ~ notifyDiscordChat ~ hasGithubRelease", hasGithubRelease)
  const axios = require('axios')
  const tag = `v${nextVersion}`

  const discordSpinner = ora('Notificando chat do discord...').start()

  try {
    await axios.post('youtube.com', {
      username: 'Asteroid',
      content: `Nova versão ${isBeta ? '**beta**' : ''} do asteroid lançada!`,
      embeds: [
        {
          title: tag,
          description: changelogContent,
          ...(hasGithubRelease && { url: `https://github.com/bildvitta/asteroid/releases/tag/${tag}` })
        }
      ]
    })

    discordSpinner.succeed('Chat do discord notificado.')
  } catch {
    discordSpinner.fail('Falha ao notificar chat do discord.')
  }
}

module.exports = notifyDiscordChat
