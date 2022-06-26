const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const Form = require('form-data');


try {
  const token: string = core.getInput('token');
  const webhook: string = core.getInput('webhook');

  const paths: string = core.getInput('files');

  const title: string = core.getInput('title');
  const description: string = core.getInput('description');
  const message: string = core.getInput('message');


  if (!process.env.GITHUB_RUN_ID) {
    throw Error("No RUN_ID found!");
  }

  type Status = 'Success' | 'Failure' | 'Cancelled'

  const octokit = github.getOctokit(token);
  octokit.rest.actions.listJobsForWorkflowRun({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    run_id: parseInt( process.env.GITHUB_RUN_ID, 10)
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

    if(description && description.length > 0){
      payload.embeds[0].description = filter(description);
    }

    const data = new Form();

    if (paths && status == 'Success') {
      const files = paths.split(",");
      for (let i = 0; i < files.length; i++) {
        const path = files[i];
        if (fs.existsSync(path)) {
          if (fs.statSync(path).isFile()) {
            data.append('file' + i, fs.createReadStream(path));
          } else {
            console.log("Cannot handle directories: " + path)
          }
        } else {
          console.log("Path not found: " + path)
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