var watermark = require('jimp-watermark');

const fs = require('node:fs');
const { PutObjectCommand, S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const client = new S3Client({
    apiVersion: '2006-03-01',
    // region: process.env.AWS_DEFAULT_REGION,
    endpoint: `http://${process.env.LOCALSTACK_HOSTNAME}:4566`,
    s3ForcePathStyle: true, // Needed to be done for S3, read here: https://docs.localstack.cloud/user-guide/integrations/sdks/javascript/
});
const { finished } = require('stream');
 
// Constructing promisify from
// util
const { promisify } = require('util');
 
// Defining finishedAsync method
const finishedAsync = promisify(finished);
const path = require('path'); 
const { extname } = require('node:path');


exports.handler = async (event) => {
    // let body = JSON.parse(event)
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    const params = {
        Bucket: bucket,
        Key: key,
    };
    console.log(params);
    const getCommand = new GetObjectCommand(params);
    try {
        const response = await client.send(getCommand);
        // The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.
        // const imgStream = await response.Body.transformToString('base64');
        let tempFile = await fs.createWriteStream(`/tmp/${key}`);
        const responseStream = await response.Body;
        responseStream.pipe(tempFile);
        await finishedAsync(responseStream);
        console.log('here');
        try {
            let extName = extname(key); 
            let dstPath = extName == '.jpeg' ? `/tmp/${path.basename(key, extName)}.jpg` : `/tmp/${key}`
            var options = {
                'text': 'NOT FOR SALE',
                'textSize': 4, //Text size must range from 1 - 8
                'dstPath': dstPath
            };
            const data = await watermark.addTextWatermark(`/tmp/${key}`, options)
            console.log(data);
            try {
                const imgStream = fs.createReadStream(dstPath);
                const putCommand = new PutObjectCommand({
                    Bucket: 'watermark-bucket',
                    Key: key,
                    Body: imgStream,
                });
                const res = await client.send(putCommand);
                console.log(res);
                const response = {
                    statusCode: 200,
                    event: event
                };
                return response;
            } catch (err) {
                console.error('PutError', err);
                const response = {
                    statusCode: 500,
                    error: err
                };
                return response;
            }
        } catch (err) {
            console.error('WaterMark', err);
            
            const response = {
                statusCode: 500,
                error: err
            };
            return response;
        }
    } catch (err) {
        console.error(err);
        const response = {
            statusCode: 500,
            error: err
        };
        return response;
    }
};
