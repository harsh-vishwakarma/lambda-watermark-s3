### Creating the Lambda Function (Hot reload on Localstack): 
To create the Lambda function, you need to take care of two things:

- Deploy via an S3 Bucket. You need to use the magic variable hot-reload as the bucket.
- Set the S3 key to the path of the directory your lambda function resides in. The handler is then referenced by the filename of your lambda code and the function in that code that needs to be invoked.

Create the Lambda Function using the awslocal CLI:
```
$ awslocal lambda create-function --function-name watermark --runtime "nodejs18.x" --timeout 30 --role arn:aws:iam::123456789012:role/lambda-ex --code S3Bucket="hot-reload",S3Key="$(pwd)" --handler index.handler
```
Incase of applicaiton with dependency Lambda function required layers, or zip node_modules with code and use below command (Hot reload doesn't work in this case): 
```
$ awslocal lambda create-function --function-name watermark --runtime "nodejs18.x" --timeout 30 --role arn:aws:iam::123456789012:role/lambda-ex --zip-file fileb://watermark.zip --handler index.handler
```

Output STDOUT:

```
{
    "FunctionName": "watermark",
    "FunctionArn": "arn:aws:lambda:us-east-1:000000000000:function:watermark",
    "Runtime": "nodejs18.x",
    "Role": "arn:aws:iam::123456789012:role/lambda-ex",
    "Handler": "index.handler",
    "CodeSize": 0,
    "Description": "",
    "Timeout": 30,
    "MemorySize": 128,
    "LastModified": "2024-01-04T18:28:24.912437+0000",
    "CodeSha256": "hot-reloading-hash-not-available",
    "Version": "$LATEST",
    "TracingConfig": {
        "Mode": "PassThrough"
    },
    "RevisionId": "7e5ed943-5970-4e5e-b2c7-105330070c59",
    "State": "Pending",
    "StateReason": "The function is being created.",
    "StateReasonCode": "Creating",
    "PackageType": "Zip",
    "Architectures": [
        "x86_64"
    ],
    "EphemeralStorage": {
        "Size": 512
    },
    "SnapStart": {
        "ApplyOn": "None",
        "OptimizationStatus": "Off"
    },
    "RuntimeVersionConfig": {
        "RuntimeVersionArn": "arn:aws:lambda:us-east-1::runtime:8eeff65f6809a3ce81507fe733fe09b835899b99481ba22fd75b5a7338290ec1"
    }
}
``` 

--------------
### Invoking function with : 
```
$ awslocal lambda invoke --function-name watermark --cli-binary-format raw-in-base64-out --payload '{"action": "test"}' outfile.txt
```
Above command is with with example payload, S3 bucket event may have different structure than above payload.

### Create the S3 Bucket and its Notification Configuration
Similar to our earlier Lambda function, let’s create the S3 bucket with LocalStack’s endpoint url:
```
$ awslocal s3api create-bucket --bucket watermark-bucket
```
or
```
$ aws --endpoint-url=http://localhost:4566 s3 mb s3://watermark-bucket

```

Next, let’s create a notification configuration JSON file for the S3 bucket. Here, we set the LambdaFunctionArn together with the S3 events for the trigger. Let’s name this file as s3-notif-config.json:

```json
{
    "LambdaFunctionConfigurations": [
        {
            "Id": "S3EventToWatermarkLambda",
            "LambdaFunctionArn": "arn:aws:lambda:ap-northeast-2:000000000000:function:watermark",
            "Events": ["s3:ObjectCreated:*"]
        }
    ]
}
```
Now to attach the trigger run this command:
```
$ aws --endpoint-url=http://localhost:4566 \
s3api put-bucket-notification-configuration --bucket image-bucket \
--notification-configuration file://s3-notif-config.json
```
You can disable notifications by adding the empty NotificationConfiguration element.