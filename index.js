/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */

const https = require('https')
const {Storage} = require('@google-cloud/storage');
const bucketName = 'teams_webhook';
const fs = require('fs');

exports.receiveMessage = (req, res) => {
    let link = req.body.build_link;
    let appName = req.body.app_name;
    let branch = req.body.branch;
    let build_status = req.body.build_status;
    let build_id = req.body.build_id;
    let build_link = req.body.build_link;

    putACatInBucket();

    const data = JSON.stringify(
        {
            "@type": "MessageCard",
            "@context": "http:\/\/schema.org\/extensions",
            "themeColor": "99334",
            "summary": `Successful Build ${appName}`,
            "sections": [{
                "activityTitle": `![TestImage](https:\/\/47a92947.ngrok.io\/Content\/Images\/default.png)A new version of ${appName} is available`,
                "activitySubtitle": req.body.os,
                "activityImage": "https:\/\/cdn1.iconfinder.com\/data\/icons\/interface-elements\/32\/accept-circle-512.png",
                "facts": [
                    {
                        "name": "built for",
                        "value": req.body.build_reason
                    }, {
                        "name": "Build number",
                        "value": `[${build_id}](${build_link})`
                    }, {
                        "name": "Start time",
                        "value": req.body.start_time
                    }, {
                        "name": "Finish Time",
                        "value": req.body.finish_time
                    }],
                "markdown": true
            }, {
                "heroImage": {
                    "image": "https:\/\/cataas.com\/cat\/gif\/says\/success?color=orange&size=40&type=or",
                    "title": "Success Kitty is happy"
                }
            }]
        })

    const options = {
        hostname: 'outlook.office.com',
        port: 443,
        path: '/webhook/dc105689-2d24-49a0-ab6e-0047c98dcb69@6c637512-c417-4e78-9d62-b61258e4b619/IncomingWebhook/03c1279f3fb4400b8f4c52e2d02c3264/2463e5cf-4111-453d-8f7d-099a35bb61dd',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    }

    const requestToTeams = https.request(options, responseFromTeams => {
        console.log(responseFromTeams.statusMessage)
        res.status(responseFromTeams.statusCode).send(link);
    })

    requestToTeams.on('error', e => {
        console.log(e)
        res.status(500).send("Error hitting teams")
    })

    requestToTeams.write(data);
    requestToTeams.end();
};

const putACatInBucket = (req, res) => {
    const options = {
        hostname: 'cataas.com',
        port: 443,
        path: '/cat/gif/says/success?color=orange&size=40&type=or',
        method: 'GET'
    }
    https.get(options, res => {
        const filename = './a-cat.gif';
        console.log(filename)

        res.pipe(fs.createWriteStream(filename))
        // Creates a client
        const storage = new Storage();

        async function uploadFile() {
            // Uploads a local file to the bucket
            await storage.bucket(bucketName).upload(filename, {
                // Support for HTTP requests made with `Accept-Encoding: gzip`
                gzip: true,
                // By setting the option `destination`, you can change the name of the
                // object you are uploading to a bucket.
                metadata: {
                    // Enable long-lived HTTP caching headers
                    // Use only if the contents of the file will never change
                    // (If the contents will change, use cacheControl: 'no-cache')
                    cacheControl: 'public, max-age=31536000',
                },
            });

            console.log(`${filename} uploaded to ${bucketName}.`);
        }

        uploadFile().catch(console.error);
    })
}