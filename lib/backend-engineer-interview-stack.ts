import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as iam from "aws-cdk-lib/aws-iam";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

export class BackendEngineerInterviewStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket
    const bucket = new s3.Bucket(this, "backend-interview-bucket", {
      bucketName: "backend-interview-bucket",
    });

    // DynamoDB Table
    const table = new dynamodb.Table(this, "backend-interview-table", {
      tableName: "backend-interview-orders-table",
      partitionKey: { name: "order_id", type: dynamodb.AttributeType.STRING },
    });

    // Lambda Function
    const lambdaFunction = new NodejsFunction(
      this,
      "backend-interview-lambda",
      {
        functionName: "backend-interview-lambda",
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        entry: "src/index.ts",
        timeout: cdk.Duration.seconds(10),
        bundling: {
          minify: true,
        },
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );

    // Grant Lambda permissions to read/write to DynamoDB
    table.grantReadWriteData(lambdaFunction);

    // Grant S3 permissions to Lambda
    bucket.grantReadWrite(lambdaFunction);

    // S3 event notification to Lambda
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED_PUT,
      new s3n.LambdaDestination(lambdaFunction)
    );
  }
}
