/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */

const https = require('https');
const {Storage} = require('@google-cloud/storage');
const bucketName = 'teams_webhook';

exports.receiveMessage = (req, res) => {
    const storage = new Storage();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file('a-cat.gif');

    const options = {
        hostname: 'cataas.com',
        port: 443,
        path: `/cat/gif/says/success?color=orange&size=40&type=or&rand=${req.body.finish_time}`,
        method: 'GET'
    };

    const catRequest = https.request(options, catResponse => {
        catResponse.pipe(file.createWriteStream()).on('finish', () => {
            postToTeams(req.body, res);
        })

    });

    catRequest.on('error', e => console.log(e));

    catRequest.end();
};

const postToTeams = (body, res) => {
    const data = JSON.stringify(
        {
            "@type": "MessageCard",
            "@context": "http:\/\/schema.org\/extensions",
            "themeColor": "99334",
            "summary": `Successful Build ${body.app_name}`,
            "sections": [{
                "activityTitle": `![TestImage](https:\/\/47a92947.ngrok.io\/Content\/Images\/default.png)A new version of ${body.app_name} is available`,
                "activitySubtitle": body.os,
                "activityImage": "https:\/\/cdn1.iconfinder.com\/data\/icons\/interface-elements\/32\/accept-circle-512.png",
                "facts": [
                    {
                        "name": "built for",
                        "value": body.build_reason
                    }, {
                        "name": "Build number",
                        "value": `[${body.build_id}](${body.build_link})`
                    }, {
                        "name": "Start time",
                        "value": body.start_time
                    }, {
                        "name": "Finish Time",
                        "value": body.finish_time
                    }],
                "markdown": true
            }, {
                "heroImage": {
                    "image": "https://storage.googleapis.com/teams_webhook/a-cat.gif",
                    "title": "Success Kitty is happy"
                }
            }, {
                "images":
                    [
                        { "image": "https://storage.googleapis.com/teams_webhook/a-cat.gif",
                            "title": "Success Kitty is happy"
                        }
                    ]
            }
            ]
        });

    console.log(data);

    const options = {
        hostname: 'outlook.office.com',
        port: 443,
        path: '/webhook/3f42eefe-009f-4df6-8488-391f40011ee1@6c637512-c417-4e78-9d62-b61258e4b619/IncomingWebhook/89e5b17135ca42318a9a3f35c8308f66/2463e5cf-4111-453d-8f7d-099a35bb61dd',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const requestToTeams = https.request(options, responseFromTeams => {
        responseFromTeams.on('error', console.log);
        res.status(responseFromTeams.statusCode).send(body.build_link);
    });

    requestToTeams.on('error', e => {
        console.log(e);
        res.status(500).send("Error hitting teams")
    });

    requestToTeams.write(data);
    requestToTeams.end();
}