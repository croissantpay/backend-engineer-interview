import { S3Handler } from "aws-lambda";
import * as AWS from "aws-sdk";
import { BatchWriteItemOutput, WriteRequests } from "aws-sdk/clients/dynamodb";
import { PromiseResult } from "aws-sdk/lib/request";
import { parse } from "csv-parse/sync";

const s3 = new AWS.S3();
const dynamo = new AWS.DynamoDB();

type Order = {
  email: string;
  order_id: string;
  date: string;
  order_value: string;
};

type DailyStat = {
  averageOrderValue: number;
  maxOrderValue: number;
  minOrderValue: number;
  totalOrderValue: number;
  numOrders: number;
};

export const handler: S3Handler = async (event) => {
  const ordersMap = new Map<string, DailyStat>();
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;

    const s3ObjectResponse = await s3
      .getObject({ Bucket: bucket, Key: key })
      .promise();
    const orderDataFile = s3ObjectResponse.Body?.toString();
    if (orderDataFile) {
      const orderData = parse(orderDataFile, { columns: true }) as Order[];
      orderData.forEach((order) => {
        const orderValue = parseFloat(order.order_value);
        if (!ordersMap.has(order.date)) {
          ordersMap.set(order.date, {
            averageOrderValue: orderValue,
            maxOrderValue: orderValue,
            minOrderValue: orderValue,
            totalOrderValue: orderValue,
            numOrders: 1,
          });
        } else {
          const currentStat = ordersMap.get(order.date);
          if (currentStat) {
            const newMax =
              orderValue > currentStat.maxOrderValue
                ? orderValue
                : currentStat.maxOrderValue;
            const newMin =
              orderValue < currentStat.minOrderValue
                ? orderValue
                : currentStat.minOrderValue;
            const newTotal = orderValue + currentStat.totalOrderValue;
            const newNumOrders = currentStat.numOrders + 1;
            const newAverage = newTotal / newNumOrders;
            ordersMap.set(order.date, {
              averageOrderValue: newAverage,
              maxOrderValue: newMax,
              minOrderValue: newMin,
              totalOrderValue: newTotal,
              numOrders: newNumOrders,
            });
          }
        }
      });
    }
  }
  const putItemRequests: WriteRequests[] = [[]];
  let requestArraysIndex = 0;
  ordersMap.forEach((dailyStat, date) => {
    if (putItemRequests[requestArraysIndex].length == 25) {
      ++requestArraysIndex;
      putItemRequests.push([]);
    }

    putItemRequests[requestArraysIndex].push({
      PutRequest: {
        Item: {
          date: { S: date },
          average_order_value: {
            N: (
              Math.round((dailyStat.averageOrderValue + Number.EPSILON) * 100) /
              100
            ).toString(),
          },
          max_order_value: {
            N: (
              Math.round((dailyStat.maxOrderValue + Number.EPSILON) * 100) / 100
            ).toString(),
          },
          min_order_value: {
            N: (
              Math.round((dailyStat.minOrderValue + Number.EPSILON) * 100) / 100
            ).toString(),
          },
          total_order_value: {
            N: (
              Math.round((dailyStat.totalOrderValue + Number.EPSILON) * 100) /
              100
            ).toString(),
          },
          num_orders: { N: dailyStat.numOrders.toString() },
        },
      },
    });
  });
  const batchWritePromises: Promise<
    PromiseResult<BatchWriteItemOutput, AWS.AWSError>
  >[] = [];
  const tables = await dynamo.listTables().promise();
  const tableName = tables.TableNames?.[0];
  if (tableName) {
    putItemRequests.forEach((requestArray) => {
      batchWritePromises.push(
        dynamo
          .batchWriteItem({
            RequestItems: { [tableName]: requestArray },
          })
          .promise(),
      );
    });
    await Promise.all(batchWritePromises);
  }
};
