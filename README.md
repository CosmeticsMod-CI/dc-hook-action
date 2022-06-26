# dc-hook-action
Discord webhook with file attachements for GitHub Actions

## Inputs

### `token`
**Required** GitHub Token.

### `webhook`
**Required** Discord Webhook URL.

### `files`
**Optional** Single or comma delimited list of paths to files which should be included.

### `title`
**Optional** The title of the embedded message.

### `message`
**Optional** A message above files and embedded message.

### `description`
**Optional** A description in the embedded message.

## Example usage

```yml
uses: cosmeticsmod-ci/dc-hook-action@v1
with:
  token: ${{ secrets.GITHUB_TOKEN }}
  webhook: ${{ secrets.WEBHOOK }}
  files: "files/FILE2.ext"
  message: "Workflow finished in {repo}"
  description: "via ${{ github.event_name }}"
```

## Placeholder

| Placeholder  | Example output |
| ------------ | -------------- |
| {status}     | Success        |
| {repo}       | dc-hook-action |

As well as all [default environment variables](https://docs.github.com/en/actions/learn-github-actions/environment-variables#default-environment-variables)

NOTICE: e.g. GITHUB_EVENT_NAME can be accessed as ${{ github.event_name }}
