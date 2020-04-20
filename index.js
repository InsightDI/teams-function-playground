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
    const file = bucket.file(process.env._CAT_FILE_NAME);

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

    //some dumb change
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
                "activityImage": `https://storage.googleapis.com/${process.env._BUCKET_O_CATS}/${process.env._CAT_FILE_NAME}?rand=${body.sent_at}`,
                "facts": [
                    {
                        "name": "Release ID",
                        "value": body.release_id
                    }, {
                        "name": "Version",
                        "value": `${body.short_version} (${body.version})`
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
            }]
        });
};

const postToTeams = (body, res) => {

    const data = formatDataForTeams(body);

    const options = {
        hostname: process.env._OUTGOING_HOST,
        port: process.env._OUTGOING_PORT,
        path: process.env._OUTGOING_PATH,
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
