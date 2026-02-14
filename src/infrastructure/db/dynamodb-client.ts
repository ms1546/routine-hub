import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const region = process.env.AWS_REGION || 'ap-northeast-1';
const endpoint = process.env.DYNAMODB_ENDPOINT;

const client = new DynamoDBClient({
  region,
  ...(endpoint && { endpoint }) // ローカル開発時にDynamoDB Localを使用する場合
});

export const dynamoDBDocumentClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false
  },
  unmarshallOptions: {
    wrapNumbers: false
  }
});

export const USER_SETTINGS_TABLE = process.env.DYNAMODB_USER_SETTINGS_TABLE || 'routune-hub-user-settings';
export const ROUTINES_TABLE = process.env.DYNAMODB_ROUTINES_TABLE || 'routune-hub-routines';
export const AI_EXECUTION_LOGS_TABLE = process.env.DYNAMODB_AI_EXECUTION_LOGS_TABLE || 'routune-hub-ai-execution-logs';
