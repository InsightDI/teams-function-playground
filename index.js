/**
 * Responds to any HTTP request.
 *
 * @param express:Request req HTTP request context.
 * @param express:Response res HTTP response context.
 */

const https = require('https')
const { Storage } = require('@google-cloud/storage')
const bucketName = 'teams_webhook'

exports.receiveMessage = (req, res) => {
  const storage = new Storage()
  const bucket = storage.bucket(bucketName)
  const file = bucket.file(process.env._CAT_FILE_NAME)

  console.log('------Start dumping env vars------');
  console.log(process.env);
  console.log('------Done dumping env vars------');

  const options = {
    hostname: 'cataas.com',
    port: 443,
    path: `/cat/gif/says/success?color=orange&size=40&type=or&rand=${req.body.sent_at}`,
    method: 'GET'
  }

  const catRequest = https.request(options, catResponse => {
    catResponse.pipe(file.createWriteStream()).on('finish', () => {
      postToTeams(req.body, res)
    })
  })

  //some dumb change
  //TODO need to send to teams without the cat this time
  catRequest.on('error', e => console.log(e))

  catRequest.end()
}

const formatDataForTeams = (body, groupName) => {
  return JSON.stringify({
    '@type': 'MessageCard',
    '@context': 'http:\/\/schema.org\/extensions',
    'themeColor': '99334',
    'summary': `${body.app_display_name} has been released. Distributed to ${groupName}`,
    'sections': [{
      'activityTitle': `A new version of ${body.app_name} has been released`,
      'activitySubtitle': body.platform,
      'activityImage': `https://storage.googleapis.com/${process.env._BUCKET_O_CATS}/${process.env._CAT_FILE_NAME}?rand=${body.sent_at}`,
      'facts': [
        {
          'name': 'Release ID',
          'value': body.release_id
        }, {
          'name': 'Distributed to',
          'value': groupName
        }, {
          'name': 'Version',
          'value': `${body.short_version} (${body.version})`
        }, {
          'name': 'Release Notes',
          'value': body.release_notes
        }, {
          'name': 'Uploaded at ',
          'value': body.uploaded_at
        }, {
          'name': 'Install Link',
          'value': `[Download](${body.install_link})`
        }],
      'markdown': true
    }]
  })
}

function getGroupName (groupId) {
  const options = {
    hostname: process.env._TEAMS_API_HOST,
    port: 443,
    path: `/v0.1/apps/${process.env._TEAMS_OWNER_NAME}/${process.env._TEAMS_APP_NAME}/distribution_groups`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Token': process.env._TEAMS_API_TOKEN
    }
  }

  return new Promise((resolve, reject) => https.get(options, (res => {
    let groupName

    res.on('data', d => {
      const group = JSON.parse(d).filter(g => g.id === groupId)
      groupName = group[0] ? group[0].name : ''
    })

    res.on('end', () => {
      resolve(groupName)
    })

    res.on('error', (error) => {
      reject(error)
    })

  })))
}

async function postToTeams (body, res) {
  const groupName = await getGroupName(body.distribution_group_id)
  const data = formatDataForTeams(body, groupName)

  const options = {
    hostname: process.env._OUTGOING_HOST,
    port: process.env._OUTGOING_PORT,
    path: process.env._OUTGOING_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  }

  const requestToTeams = https.request(options, responseFromTeams => {
    responseFromTeams.on('error', console.log)
    res.status(responseFromTeams.statusCode).send(body.build_link)
  })

  requestToTeams.on('error', e => {
    console.log(e)
    res.status(500).send('Error hitting teams')
  })

  requestToTeams.write(data)
  requestToTeams.end()
}


//dev webhook = /webhook/dc105689-2d24-49a0-ab6e-0047c98dcb69@6c637512-c417-4e78-9d62-b61258e4b619/IncomingWebhook/03c1279f3fb4400b8f4c52e2d02c3264/2463e5cf-4111-453d-8f7d-099a35bb61dd
//prod webhook = /webhook/3f42eefe-009f-4df6-8488-391f40011ee1@6c637512-c417-4e78-9d62-b61258e4b619/IncomingWebhook/89e5b17135ca42318a9a3f35c8308f66/2463e5cf-4111-453d-8f7d-099a35bb61dd