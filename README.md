# notion-cookbook-fetcher

## Development

### Deployment

Setup gcloud
* [Install the gcloud CLI](https://cloud.google.com/sdk/docs/install) and login: `gcloud auth login`
* Set the default project: `gcloud config set project <PROJECT_ID>`

Secrets
* `gcloud secrets create notion-access-token --replication-policy="automatic"`
* `gcloud secrets versions add notion-access-token --data-file="<file path e.g. /tmp/notion-access-token.txt>"`(Be careful not to add a line break. Otherwise, you might see  an `not a legal HTTP header value` error.)
* [Granting access to secrets](https://cloud.google.com/functions/docs/configuring/secrets#grant-access)

Deploy
* Create an environment file: `cp .env.yaml.example .env.yaml`
* Start the deployment: `npm run deploy`

### Notes

* [Guide for using Cloud Functions with TypeScript](https://github.com/GoogleCloudPlatform/functions-framework-nodejs/blob/main/docs/typescript.md)
