import { S3Handler } from "aws-lambda";
import * as AWS from "aws-sdk";

const tableName = process.env.TABLE_NAME!;

export const handler: S3Handler = async (event) => {
  console.log(`Received event: ${JSON.stringify(event, null, 2)}`);
};
