import * as dotenv from 'dotenv';
import {Bucket, ListBucketsCommandOutput, S3} from '@aws-sdk/client-s3';
dotenv.config();



const s3Client = new S3({ region: 'eu-central-1' });

const getBuckets = async () : Promise<Bucket[]> => {
        try {
            return  (await s3Client.listBuckets({})).Buckets;
        }catch (e){
            console.log(e)
        }
};

export async function main() {
    let listRecording : [] = [];
    try {
        let buckets  = await getBuckets();
        console.log("BUCKETS ", buckets);
    } catch (error) {
        console.error('Error:', error);
    }
}

main().catch(error => {
    console.error('Error in main function:', error);
});


