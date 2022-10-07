async function createGithubRelease ({ body, isBeta, version, ora, onSuccess = () => {} }) {
  const { Octokit } = require("@octokit/rest")

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  })

  const versionTag = `v${version}`

  const publishReleaseSpinner = ora('Publicando release no github...').start()

  try {
    await octokit.request('POST /repos/douglascalora/automatic-release-asteroid/releases', {
      owner: 'douglascalora', // TODO alterar
      repo: 'automatic-release-asteroid', // TODO alterar
      tag_name: versionTag,
      target_commitish: isBeta ? 'main-homolog' : 'main',
      name: versionTag,
      body,
      draft: false,
      prerelease: isBeta,
      generate_release_notes: false
    })

    publishReleaseSpinner.succeed('Publicado release no github com sucesso!')
    return Promise.resolve({ success: true })
  } catch {
    publishReleaseSpinner.fail('Falha ao publicar release no github.')
    return Promise.resolve({ success: true })
  }
}

module.exports = createGithubRelease
