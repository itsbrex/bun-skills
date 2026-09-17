# Installation, app links, and sharing

[Back to README](../README.md) | [Maintenance and releases](../README.md#updating-the-skills)

The plugin name and marketplace name are both `bun-skills`. The repository root is the plugin in both ecosystems, and both load `skills/`. Use a current Claude Code or Codex installation with plugin support; check `codex plugin --help` before continuing.

## Install from GitHub

Claude Code, inside an interactive session:

```text
/plugin marketplace add itsbrex/bun-skills
/plugin install bun-skills@bun-skills
```

`marketplace add` registers a catalog; `plugin install` installs its plugin. There is no `/plugin marketplace install` command. To use the terminal instead:

```sh
claude plugin marketplace add itsbrex/bun-skills
claude plugin install bun-skills@bun-skills
```

Codex, from a terminal:

```sh
codex plugin marketplace add itsbrex/bun-skills
codex plugin add bun-skills@bun-skills
```

No Bun installation, dependency install, API key, or Lightpanda download is needed to consume these documentation skills. Agent CLIs handle their own plugin caches. Restart Claude or run `/reload-plugins`; start a new Codex task to pick up the installed skills.

## Install a local checkout

Clone the repository, then run the relevant commands from its root:

```sh
git clone https://github.com/itsbrex/bun-skills.git
cd bun-skills
```

Claude Code:

```sh
claude plugin marketplace add .
claude plugin install bun-skills@bun-skills
```

Codex:

```sh
codex plugin marketplace add .
codex plugin add bun-skills@bun-skills
```

Choose either the Git-backed source or your local checkout for the `bun-skills` marketplace, not both under the same name. If already registered, inspect `claude plugin marketplace list` or `codex plugin marketplace list` before switching sources. A local marketplace is not a live reload of the installed plugin: reinstall after regenerating the checkout.

## Local clickable link page

With Bun installed, run from the repository root:

```sh
bun run plugin:links --open
```

This validates the packaged files, generates `.cache/plugin-links.html`, and opens that file in your default browser. The page contains clickable **View bun-skills**, **Share bun-skills**, and **Open Claude Code setup** links, derived from this checkout's actual path. No server, dependencies, marketplace registration, installation, upload, or account changes are performed by the helper.

For terminals without a browser, use:

```sh
bun run plugin:links        # print Markdown app links; write nothing
bun run plugin:links --html # save the local HTML page without opening it
```

Generated links stay local in ignored `.cache/`; do not commit them or advertise them as portable install URLs. Moving the checkout requires regenerating them. GitHub strips custom URL schemes from Markdown links; a local HTML page preserves them. [Claude's deep-link documentation](https://code.claude.com/docs/en/deep-links#the-link-renders-as-plain-text-instead-of-being-clickable) explains this restriction.

## View bun-skills in Codex

Register your local checkout with `codex plugin marketplace add .`, then generate the [local link page](#local-clickable-link-page). **View bun-skills** opens the Codex plugin details for that checkout. Install with `codex plugin add bun-skills@bun-skills` or the available installation control in the app.

The URL contains the absolute path to `.agents/plugins/marketplace.json`, encoded as the `marketplacePath` query parameter. It is not a GitHub URL, and it cannot be made portable by replacing the path with `~`, a relative path, or the remote repository URL. The helper does not add unsupported `pluginName` or `hostId` parameters.

## Share bun-skills from Codex

On the same local link page, **Share bun-skills** opens Codex's sharing controls using the View URL plus `mode=share`. Opening those controls does not publish the plugin. Any upload, audience selection, or account requirements are handled by Codex after you review them.

For a portable link today, share [this repository's installation instructions](https://github.com/itsbrex/bun-skills#install). A hosted Codex share URL must come from a successful app share operation; this repository does not invent one or include a maintainer's private local path. An app-generated hosted share is separate from the Git marketplace and its update workflow.

## Claude Code links

[Open Claude Code setup](claude-cli://open?repo=itsbrex%2Fbun-skills&q=%2Fplugin%20marketplace%20add%20itsbrex%2Fbun-skills)

Where custom schemes are supported, that link opens a terminal session and prefills the GitHub marketplace command. Review and submit it, then run `/plugin install bun-skills@bun-skills`. The helper's local-page variant uses your checkout instead. Claude Code's `claude-cli://open` handler must already be registered; see [the official deep-link reference](https://code.claude.com/docs/en/deep-links).

For GitHub readers, the same URL is available to copy into a browser's address bar:

```text
claude-cli://open?repo=itsbrex%2Fbun-skills&q=%2Fplugin%20marketplace%20add%20itsbrex%2Fbun-skills
```

This is a setup-session link, not a silent install or a published Claude marketplace listing. Share [the Claude installation section](https://github.com/itsbrex/bun-skills#claude-code-plugin) with other users. No hosted Claude plugin share URL has been created for this repository.

## Test an unreleased branch

Default-branch commands cannot install files that only exist in a pull request. For this feature branch, use the relevant agent's branch syntax:

```sh
claude plugin marketplace add 'https://github.com/itsbrex/bun-skills.git#feat/update-skills'
claude plugin install bun-skills@bun-skills
```

```sh
codex plugin marketplace add itsbrex/bun-skills --ref feat/update-skills
codex plugin add bun-skills@bun-skills
```

If the marketplace name is already registered from another source, inspect it before replacing it. A fresh clone checked out to the branch plus the local installation commands is another option. After merge, use the default-branch commands from the README.

## Update and uninstall

Refresh Git-backed installations:

```sh
claude plugin marketplace update bun-skills
claude plugin update bun-skills@bun-skills
```

```sh
codex plugin marketplace upgrade bun-skills
codex plugin add bun-skills@bun-skills
```

For local sources, update the checkout, run `bun run sync:plugins` if maintaining it, and rerun that agent's install command. Neither `bun install` nor `bun run update` refreshes global agent caches. Start a new session/task afterward.

Remove only this plugin when no longer needed:

```sh
claude plugin uninstall bun-skills@bun-skills
codex plugin remove bun-skills@bun-skills
```

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Marketplace/plugin not found | Confirm the branch contains its catalog, add the marketplace before installing, and inspect the configured source. |
| Codex shows old skills | Refresh the Git marketplace or update the local checkout, reinstall, then start a new task. |
| App link does nothing | Confirm the matching app/URL handler is installed. Use terminal commands when your renderer blocks custom schemes. |
| Codex local link fails on another machine | Regenerate links in that machine's checkout. Share repository instructions instead of local paths. |
| Helper reports stale manifests | Maintainers should run `bun run sync:plugins`, review the generated changes, then retry. |
| Duplicate skill entries | Remove the duplicate individual-skill installation; keep the agent's plugin installation. |
| Claude context cost is high | Inspect `claude plugin details bun-skills@bun-skills`; disable the plugin when not working with Bun. |

Commands were checked against installed CLI help and [Claude's installation reference](https://code.claude.com/docs/en/discover-plugins) on 2026-09-16. Native loader validation is described in [the README](../README.md#verification-and-recovery).
