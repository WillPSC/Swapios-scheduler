import * as dotenv from 'dotenv';
import {Bucket, ListObjectsV2Command, GetObjectCommand, S3} from '@aws-sdk/client-s3';
import {Readable} from "stream";
import Crunker from "crunker";


const fs = require('fs');
let crunker = new Crunker();


dotenv.config();


const s3Client = new S3({region: 'eu-central-1'});
const STRAPI_DAILY_PARTICIPANT_URL = "http://localhost:1337/api/daily-particpants?populate[users_permissions_user][fields]=username&fields=particpant_id&filters[particpant_id][$eq]=";

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
        let contents = [];

        while (isTruncated) {

            const {Contents, IsTruncated, NextContinuationToken} = await s3Client.send(command);
            console.log("CONTENTS ", IsTruncated)
            Contents.map((c) => contents.push(c.Key));
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

        fs.writeFile("./recording/"+pathFile.split("/")[2]+".weba", res, (writeErr) => {
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

const uploadRecordingToS3 =  () => {

}

const extractParticipantIDRecording = (recordingName: string) => {

    return recordingName.substring(recordingName.indexOf("-") + 1, recordingName.lastIndexOf("-") - 10)

}

const getProfessionalName = async (dailyParticipantID: string) => {
    try {

        const url = STRAPI_DAILY_PARTICIPANT_URL + dailyParticipantID;
        const participantsId = (await fetch(url, {
                    headers: {Authorization: `Bearer ${process.env.STRAPI_KEY}`}
                }
            )
        ).json();
        return participantsId;
    } catch (err) {
        console.error("failed to fetch participant ids", err)
    }
}


/*const mergeAudio = (listAudio) => {

    crunker
        .fetchAudio(audio1)
        .then((buffers) => crunker.mergeAudio(buffers))
        .then((merged) => crunker.export(merged, 'audio/mp3'))
        .then((output) => crunker.download(output.blob))
        .catch((error) => {
            throw new Error(error);
        });
}*/
export async function main() {
    let listRecording = [];

    try {

        let buckets = await getBuckets();

        let contents = await getListOfBucketObjects(buckets[2].Name, "swapios/1002/");

        for (const content of contents) {

            let professionalObj = await getProfessionalName(extractParticipantIDRecording(content));
            let professionalName : string = professionalObj.data[0].attributes.users_permissions_user.data.attributes.username

            if (!listRecording.some(obj => Object.keys(obj)[0] === professionalName)){

                listRecording.push({ [professionalName]: [content] })
                await downloadRecordingObject(buckets[2].Name, content)

            }else{

                listRecording.find(obj => Object.keys(obj)[0] === professionalName)[professionalName].push(content);
                await downloadRecordingObject(buckets[2].Name, content)

            }
        }
        console.log(listRecording)

    } catch (error) {
        console.error('Error:', error);
    }
}

main().catch(error => {
    console.error('Error in main function:', error);
});


