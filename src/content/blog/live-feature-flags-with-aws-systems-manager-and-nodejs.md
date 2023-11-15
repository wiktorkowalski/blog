---
author: Wiktor Kowalski
pubDatetime: 2023-11-16T08:00:00.000Z
title: Live Feature Flags with AWS Systems Manager and Node.js
postSlug: live-feature-flags-with-aws-systems-manager-and-nodejs
featured: false
tags:
  - node.js
  - nest.js
  - aws
  - featureflags
description: Implementing Feature Flags in Node.js using AWS Systems Manager
---

# What are feature flags?

Feature flags, also known as feature toggles, are a technique in modern software development that enables developers to turn certain functionalities on or off without altering the codebase. This approach facilitates controlled testing, phased rollouts, and the ability to quickly respond to issues by enabling or disabling features in real-time. By decoupling deployment and feature release, feature flags provide a flexible mechanism for managing and iterating on software features in various environments.

# Setup in AWS

I'm gonna assume you've got your AWS account and AWS CLI set up, so we're gonna skip that part.  
I'm also gonna assume you have created an empty Nest.js project, and have basic knowledge about Nest.js.

Let's start by creating a parameter:

```bash
aws ssm put-parameter --name "/FeatureFlags/FeatureA" --value "true" --type String
```

and then some more:

```bash
aws ssm put-parameter --name "/FeatureFlags/FeatureB" --value "false" --type String
aws ssm put-parameter --name "/FeatureFlags/FeatureC" --value "true" --type String
```

and now let's check one just to be sure:

```bash
aws ssm get-parameter --name "/FeatureFlags/FeatureA"
```

and list them all:

```bash
aws ssm describe-parameters --filters "Key=Name,Values=/FeatureFlags/"
```

That's all we need to do for now in AWS, let's move to code example.

# Configuration

First, install required package:

```bash
npm install --save @aws-sdk/client-ssm
```

and add a service class that will make sure feature flags have up to date values:

```ts
// /src/ssm.service.ts
import { Injectable, OnModuleInit } from "@nestjs/common";
import { SSMClient, GetParametersByPathCommand } from "@aws-sdk/client-ssm";

@Injectable()
export class SsmService implements OnModuleInit {
  private ssm;
  private featureFlags: FeatureFlags;

  constructor() {
    this.ssm = new SSMClient();
  }

  async onModuleInit() {
    await this.loadFeatureFlags();
    setInterval(() => this.loadFeatureFlags(), 5000); // remember to try-catch this!
  }

  private async loadFeatureFlags() {
    const command = new GetParametersByPathCommand({
      Path: "/FeatureFlags",
    });
    const response = await this.ssm.send(command);
    this.featureFlags = response.Parameters.reduce((acc, param) => {
      const key = param.Name.split("/").pop();
      return {
        ...acc,
        [key]: param.Value === "true",
      };
    }, {} as FeatureFlags);
  }

  getFeatureFlags() {
    return this.featureFlags;
  }
}

export type FeatureFlags = {
  featureA: boolean;
  featureB: boolean;
  featureC: boolean;
};
```

Remember to adjust the `loadFeatureFlags` interval to more suitable value as calls to AWS SSM API are not free.

That takes care of the configuration.

# Usage

Now the `SsmService` is available to be passed to the controller where we can use FeatureFlags.

```ts
// src/feature-flags/feature-flags.controller.ts
import { Controller, Get } from "@nestjs/common";
import { SsmService } from "src/ssm.service";

@Controller("feature-flags")
export class FeatureFlagsController {
  constructor(private ssmService: SsmService) {}

  @Get()
  getFeatureFlags() {
    return this.ssmService.getFeatureFlags();
  }
}
```

Remember to add everything necessary to `app.module.ts`.

```ts
import { Module } from "@nestjs/common";
import { FeatureFlagsController } from "./feature-flags/feature-flags.controller";
import { SsmService } from "./ssm.service";

@Module({
  imports: [],
  controllers: [FeatureFlagsController],
  providers: [SsmService],
})
export class AppModule {}
```

Now the `GET /feature-flags` endpoint returns:

```json
{
  "featureA": true,
  "featureB": false,
  "featureC": true
}
```

Now let's get to the magic part.

# Live reload of config values

While keeping the app running, let's change the parameter values:

```bash
aws ssm put-parameter --name "/FeatureFlags/FeatureA" --value "false" --type String --overwrite
aws ssm put-parameter --name "/FeatureFlags/FeatureB" --value "true" --type String --overwrite
aws ssm put-parameter --name "/FeatureFlags/FeatureC" --value "false" --type String --overwrite
```

and calling the `GET /feature-flags` endpoint again will return:

```json
{
  "featureA": false,
  "featureB": true,
  "featureC": false
}
```

That's it!

# How's that useful?

Live feature flags transform application management by allowing changes without restarts or deployments. By injecting these flags with each request, updates happen in real-time, significantly speeding up the process and enhancing responsiveness.

However, this approach requires some changes in apps where entire configuration is based on enviroinment variables. You can no longer build config once at startup and use it as a singleton, so a proper usage of dependency injection is vital.

Checkout [this post](https://blog.wiktorkowalski.pl/posts/live-feature-flags-with-aws-systems-manager-and-dotnet/) where I implement the same mechanism in .NET!
