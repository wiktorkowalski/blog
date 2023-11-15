---
author: Wiktor Kowalski
pubDatetime: 2023-11-08T10:00:00.000Z
title: Live Feature Flags with AWS Systems Manager and .NET
postSlug: live-feature-flags-with-aws-systems-manager-and-dotnet
featured: true
tags:
  - dotnet
  - asp.net
  - aws
  - featureflags
description: Implementing Feature Flags in .NET using AWS Systems Manager
---

# What are feature flags?

Feature flags, also known as feature toggles, are a technique in modern software development that enables developers to turn certain functionalities on or off without altering the codebase. This approach facilitates controlled testing, phased rollouts, and the ability to quickly respond to issues by enabling or disabling features in real-time. By decoupling deployment and feature release, feature flags provide a flexible mechanism for managing and iterating on software features in various environments.

# Setup in AWS

I'm gonna assume you've got your AWS account and AWS CLI set up, so we're gonna skip that part.  
I'm also gonna assume you have created an empty ASP.NET API project.

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
dotnet add package Amazon.Extensions.Configuration.SystemsManager --version 6.0.0
```

and add following to `Program.cs`:

```cs
builder.Configuration.AddSystemsManager(o =>
{
    o.ReloadAfter = TimeSpan.FromSeconds(5);
    o.Path = "/FeatureFlags";
});
```

This adds a `ConfigurationProvider` to the app that will talk with AWS SSM.
Remember to adjust the `ReloadAfter` parameter to more suitable value as calls to AWS SSM API are not free.

We'll also need a class that would represent parameters we've added before:

```cs
public class FeatureFlagsOptions
{
    public bool FeatureA { get; set; }
    public bool FeatureB { get; set; }
    public bool FeatureC { get; set; }
}
```

and bind the class to the configuration:

```cs
builder.Services.Configure<FeatureFlagsOptions>(builder.Configuration);
```

That takes care of the configuration.

# Usage

Now that we've added `ConfigurationProvider` to our app, and DI Container, we can use the feature flags just by injecting the `IOptionsSnapshot<FeatureFlagsOptions>` where it's needed.

```cs
[ApiController]
[Route("[controller]")]
public class FeatureFlagsController : Controller
{
    private readonly IOptionsSnapshot<FeatureFlagsOptions> _optionsSnapshot;

    public FeatureController(IOptionsSnapshot<FeatureFlagsOptions> optionsSnapshot)
    {
        _optionsSnapshot = optionsSnapshot;
    }

    [HttpGet()]
    public async Task<IActionResult> GetFeatureFlags()
    {
        return Ok(_optionsSnapshot.Value);
    }
}
```

Now the `GET /featureflags` endpoint returns:

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

and calling the `GET /featureflags` endpoint again will return:

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

Checkout [this post](https://blog.wiktorkowalski.pl/posts/live-feature-flags-with-aws-systems-manager-and-nodejs/) where I implement the same mechanism in Node.js!
