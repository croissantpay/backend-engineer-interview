import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Duration } from "aws-cdk-lib";

export class BackendEngineerInterviewStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // TODO: Implement the architecture outlined at https://docs.google.com/document/d/1ikhJu3pB0Ep-hVVpinf7KRIGejl7lO_RIvINXYFT9JI/edit?usp=sharing
    // create s3 bucket to store Paws & Mitts order data
    const pmOrderDataBucket = new s3.Bucket(this, "paws-mitts-order-data");

    // create dynamodb table to store daily paws & mitts order stats
    const pmDailyOrderStatsTable = new dynamodb.TableV2(
      this,
      "paws-mitts-daily-order-stats",
      {
        partitionKey: { name: "date", type: dynamodb.AttributeType.STRING },
      },
    );

    // create lambda function which will run when order data file is uploaded to s3 bucket
    const pmOrderDataProcessorLambda = new NodejsFunction(
      this,
      "paws-mitts-order-data-processor",
      {
        entry: "src/index.ts",
        initialPolicy: [
          new PolicyStatement({
            actions: ["s3:GetObject", "s3:ListBucket"],
            resources: [
              pmOrderDataBucket.bucketArn,
              pmOrderDataBucket.arnForObjects("*"),
            ],
          }),
          new PolicyStatement({
            actions: ["dynamodb:BatchWriteItem"],
            resources: [pmDailyOrderStatsTable.tableArn],
          }),
          new PolicyStatement({
            actions: ["dynamodb:ListTables"],
            resources: [
              `arn:aws:dynamodb:${this.region}:${this.account}:table/*`,
            ],
          }),
        ],
        timeout: Duration.seconds(30),
      },
    );

    // set up notification to be sent from s3 bucket on upload to the lambda function
    pmOrderDataBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(pmOrderDataProcessorLambda),
    );
  }
}
