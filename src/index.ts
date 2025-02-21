import { S3Handler } from "aws-lambda";
import * as AWS from "aws-sdk";

const s3 = new AWS.S3({ region: "us-east-1" });

export const handler: S3Handler = async (event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;

    console.log(`Bucket: ${bucket}, Key: ${key}`);
  }
};
