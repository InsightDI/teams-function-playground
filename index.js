/**
 * Responds to any HTTP request.
 *
 * @param express:Request req HTTP request context.
 * @param express:Response res HTTP response context.
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
        path: `/cat/gif/says/success?color=orange&size=40&type=or&rand=${req.body.sent_at}`,
        method: 'GET'
    };

    const catRequest = https.request(options, catResponse => {
        catResponse.pipe(file.createWriteStream()).on('finish', () => {
            postToTeams(req.body, res);
        })

    });

    //TODO need to send to teams without the cat this time
    catRequest.on('error', e => console.log(e));

    catRequest.end();
};

const formatDataForTeams = body => {
    return JSON.stringify({
            "@type": "MessageCard",
            "@context": "http:\/\/schema.org\/extensions",
            "themeColor": "99334",
            "summary": `${body.app_display_name} has been released`,
            "sections": [{
                "activityTitle": `A new version of ${body.app_name} has been released`,
                "activitySubtitle": body.platform,
                "activityImage": "https:\/\/encrypted-tbn0.gstatic.com\/images?q=tbn%3AANd9GcSeAq5IY6N74uXfsFQ6LM8r36xuinm9OHQpf5DawndNVM-h_ZLl&usqp=CAU",
                "facts": [
                    {
                        "name": "Release ID",
                        "value": body.release_id
                    }, {
                        "name": "Version",
                        "value": body.version
                    }, {
                        "name": "Release Notes",
                        "value": body.release_notes
                    }, {
                        "name": "Uploaded at ",
                        "value": body.uploaded_at
                    }, {
                        "name": "Install Link",
                        "value": `[Download](${body.install_link})`
                    }],
                "markdown": true
            }, {
                "images":
                    [
                        { "image": `https://storage.googleapis.com/teams_webhook/a-cat.gif?rand=${body.sent_at}`,
                            "title": "Success Kitty is happy"
                        }
                    ]
            }
            ]
        });
};

const postToTeams = (body, res) => {

    const data = formatDataForTeams(body);

    const options = {
        hostname: 'outlook.office.com',
        port: 443,
        path: '/webhook/dc105689-2d24-49a0-ab6e-0047c98dcb69@6c637512-c417-4e78-9d62-b61258e4b619/IncomingWebhook/03c1279f3fb4400b8f4c52e2d02c3264/2463e5cf-4111-453d-8f7d-099a35bb61dd',
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
};