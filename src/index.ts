import { S3Handler } from "aws-lambda";
import * as AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.TABLE_NAME!;

export const handler: S3Handler = async (event) => {
  for (const record of event.Records) {
    console.log(record.s3.object.key);
  }
};
