import * as dotenv from 'dotenv';
import {Bucket, ListObjectsV2Command, GetObjectCommand, S3} from '@aws-sdk/client-s3';
import {Readable} from "stream";

const fs = require('fs');

dotenv.config();


const s3Client = new S3({region: 'eu-central-1'});

const getBuckets = async (): Promise<Bucket[]> => {
    try {
        return (await s3Client.listBuckets({})).Buckets;
    } catch (e) {
        console.log(e)
    }
};

const getListOfBucketObjects = async (nameBucket: string, path?: string) => {

    const command = new ListObjectsV2Command({
        Bucket: nameBucket,
        Prefix: path
    });

    try {
        let isTruncated = true;

        console.log("Your bucket contains the following objects:\n");
        let contents = "";
        while (isTruncated) {
            const {Contents, IsTruncated, NextContinuationToken} = await s3Client.send(command);

            console.log("Contents: ", Contents);

            const contentsList = Contents.map((c) => ` • ${c.Key}`).join("\n");
            contents += contentsList + "\n";
            isTruncated = IsTruncated;
            command.input.ContinuationToken = NextContinuationToken;
        }
        return contents
    } catch (err) {
        console.error(err);
    }
}

const downloadRecordingObject = async (nameBucket: string, pathFile: string) => {

    const params = {
        Bucket: nameBucket,
        Key: pathFile
    }
    const command = new GetObjectCommand(params);
    try {

        const {Body} = await s3Client.send(command);

        let res = await Body.transformToByteArray();

        fs.writeFile("./recording/1708466239040-0736a252-241e-4aad-8da9-a984ecfb6d81-cam-audio-1708466239683.weba", res, (writeErr) => {
            if (writeErr) {
                console.error("Error writing file: ", writeErr);
                throw new Error("Error writing file ")

            } else {
                console.log(`Object downloaded successfully to ./recording`);
            }
        });

    } catch (err) {
        console.error(err);
    }

}

export async function main() {
    let listRecording: string[] = [];

    try {

        let buckets = await getBuckets();
        console.log("BUCKETS ", buckets);

        let contents = await getListOfBucketObjects(buckets[2].Name, "swapios/recordingRoom/1709476903173");
        console.log(contents);


        //await downloadRecordingObject(buckets[2].Name, "swapios/totoRoom/1708466239040-0736a252-241e-4aad-8da9-a984ecfb6d81-cam-audio-1708466239683");



    } catch (error) {
        console.error('Error:', error);
    }
}

main().catch(error => {
    console.error('Error in main function:', error);
});


