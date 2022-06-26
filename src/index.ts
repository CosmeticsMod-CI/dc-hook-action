const core = require('@actions/core');
const github = require('@actions/github');

const fs = require('fs');
const path = require('path');
const tar = require('tar');

const Form = require('form-data');

try {
  const token: string = core.getInput('token');
  const webhook: string = core.getInput('webhook');

  const paths: string = core.getInput('files');

  const title: string = core.getInput('title');
  const description: string = core.getInput('description');
  const message: string = core.getInput('message');

  const archiveDir: Boolean = core.getInput('archiveDir');

  if (!process.env.GITHUB_RUN_ID) {
    throw Error("No RUN_ID found!");
  }

  type Status = 'Success' | 'Failure' | 'Cancelled'

  const octokit = github.getOctokit(token);
  octokit.rest.actions.listJobsForWorkflowRun({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    run_id: parseInt(process.env.GITHUB_RUN_ID, 10)
  }).then((res) => {

    let status: Status = 'Success';
    let color: Number = 65280;
    for (const job of res.data.jobs) {
      if (job.status === 'completed') {
        console.log(job.conclusion)
        if (job.conclusion.includes('Failure')) {
          status = 'Failure';
          color = 16711680;
          break;
        }
        if (job.conclusion.includes('Cancelled')) {
          status = 'Cancelled';
          color = 6710886;
          break;
        }
      }
    }

    const filter = (msg: string): string => {
      return msg.replace('{status}', status).replace('{repo}', github.context.repo.repo);
    }

    const payload: any = {
      embeds: [
        {
          title: filter(title),
          color: color,
          footer: {
            text: github.context.actor,
            icon_url: `https://github.com/${github.context.actor}.png`
          }
        }
      ],
    }

    if (message && message.length > 0) {
      payload.content = filter(message);
    }

    if (description && description.length > 0) {
      payload.embeds[0].description = filter(description);
    }

    const data = new Form();

    if (paths && status == 'Success') {
      const files = paths.split(",");
      for (let i = 0; i < files.length; i++) {
        const fpath = files[i];
        if (fs.existsSync(fpath)) {
          if (fs.statSync(fpath).isFile()) {
            data.append('file' + i, fs.createReadStream(fpath));
          } else if (fs.statSync(fpath).isDirectory()) {
            if (archiveDir) {
              data.append('file' + i, tar.c({ gzip: true, sync: true }, [fpath]), { filename: path.parse(fpath).name + ".tar.gz" });
            } else {
              let j = 0;
              fs.readdirSync(fpath).filter(file => fs.statSync(path.join(fpath, file)).isFile()).forEach(file => data.append('file' + i + "_" + (j++), fs.createReadStream(path.join(fpath, file))));
            }
          } else {
            console.log("Skip: " + fpath)
          }
        } else {
          console.log("Path not found: " + fpath)
        }
      }
    }

    data.append('payload_json', JSON.stringify(payload));
    data.submit(webhook, function (err, res) {
      if (err) throw err;
      console.log("Submit data with status code: " + res.statusCode);
    });
  });

} catch (error: any) {
  core.setFailed(error.message);
}