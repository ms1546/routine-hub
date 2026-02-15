import json
import boto3
import os

ecs = boto3.client('ecs')
elbv2 = boto3.client('elbv2')

ECS_CLUSTER_NAME = os.environ['ECS_CLUSTER_NAME']
ECS_SERVICE_NAME = os.environ['ECS_SERVICE_NAME']
ALB_ARN = os.environ['ALB_ARN']


def handler(event, context):
    """
    Lambda function to start or stop ECS service and ALB based on EventBridge schedule.

    Event input:
    {
        "action": "start" | "stop"
    }
    """
    action = event.get('action', 'stop')

    try:
        if action == 'stop':
            # Stop ECS service (set desired_count to 0)
            ecs.update_service(
                cluster=ECS_CLUSTER_NAME,
                service=ECS_SERVICE_NAME,
                desiredCount=0
            )

            # Disable ALB deletion protection temporarily and stop it
            # Note: ALB cannot be stopped directly, but we can set desired_count to 0
            # which effectively stops the service

            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': f'Successfully stopped ECS service {ECS_SERVICE_NAME}',
                    'action': 'stop'
                })
            }

        elif action == 'start':
            # Start ECS service (set desired_count to 1)
            ecs.update_service(
                cluster=ECS_CLUSTER_NAME,
                service=ECS_SERVICE_NAME,
                desiredCount=1
            )

            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': f'Successfully started ECS service {ECS_SERVICE_NAME}',
                    'action': 'start'
                })
            }

        else:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': f'Invalid action: {action}. Must be "start" or "stop"'
                })
            }

    except Exception as e:
        print(f'Error executing {action} action: {str(e)}')
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'action': action
            })
        }
