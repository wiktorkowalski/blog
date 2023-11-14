---
author: Wiktor Kowalski
pubDatetime: 2023-11-08T10:00:00.000Z
title: Live Feature Flags with AWS Systems Manager and .NET
postSlug: live-feature-flags-with-aws-systems-manager-and-dotnet
featured: true
tags:
  - dotnet
  - node.js
  - aws
description: Implementing Feature Flags in .NET and Node.js using AWS Systems Manager
---

# What are feature flags?

# Setup in AWS

I'm gonna assume you've got your AWS account and AWS CLI set up, so we're gonna skip that part.  
I'm also gonna assume you have created an empty ASP.NET API project

Let's start by creating a parameter

```bash
aws ssm put-parameter --name "/FeatureFlags/FeatureA" --value "true" --type String
```

and then some more

```bash
aws ssm put-parameter --name "/FeatureFlags/FeatureB" --value "false" --type String
aws ssm put-parameter --name "/FeatureFlags/FeatureC" --value "true" --type String
```

and now let's check one just to be sure

```bash
aws ssm get-parameter --name "/FeatureFlags/FeatureA"
```

and list them all

```bash
aws ssm describe-parameters --filters "Key=Name,Values=/FeatureFlags/"
```

That's all we need to do for now in AWS, let's move to code example

# Configuration

Here's what you need to do:  
Install required package

```bash
dotnet add package Amazon.Extensions.Configuration.SystemsManager --version 6.0.0
```

and add following to `Program.cs`

```cs
builder.Configuration.AddSystemsManager(o =>
{
    o.ReloadAfter = TimeSpan.FromSeconds(5);
    o.Path = "/FeatureFlags";
});
```

This adds a `ConfigurationProvider` to the app that will talk with AWS SSM.
Remember to adjust the `ReloadAfter` parameter to more suitable value as calls to AWS SSM API are not free.

We'll also need a class that would represent parameters we've added before

```cs
public class FeatureFlagsOptions
{
    public bool FeatureA { get; set; }
    public bool FeatureB { get; set; }
    public bool FeatureC { get; set; }
}
```

and bind the class to the configuration

```cs
builder.Services.Configure<FeatureFlagsOptions>(builder.Configuration);
```

That takes care of the configuration.

# Usage

Now that we've added `ConfigurationProvider` to our app, and DI Container, we can use the feature flags just by injecting the `IOptionsSnapshot<FeatureFlagsOptions>` where it's needed

```cs
[ApiController]
[Route("[controller]")]
public class FeatureFlagsController : Controller
{
    private readonly IOptionsSnapshot<FeatureFlagsOptions> _optionsSnapshot;

    public WeatherController(IOptionsSnapshot<FeatureFlagsOptions> optionsSnapshot)
    {
        _optionsSnapshot = optionsSnapshot;
    }

    [HttpGet()]
    public async Task<IActionResult> GetWeather()
    {
        return Ok(weather);
    }
}
```

Now the `GET /featureflags` endpoint returns

```json
{
  "featureA": true,
  "featureB": false,
  "featureC": true
}
```

Now let's get to the magic part

# Live reload of config values

While keeping the app running, let's change the parameter values

```bash
aws ssm put-parameter --name "/FeatureFlags/FeatureA" --value "false" --type String --overwrite
aws ssm put-parameter --name "/FeatureFlags/FeatureB" --value "true" --type String --overwrite
aws ssm put-parameter --name "/FeatureFlags/FeatureC" --value "false" --type String --overwrite
```

and calling the `GET /featureflags` endpoint again will return

```json
{
  "featureA": false,
  "featureB": true,
  "featureC": false
}
```

That's it!

# How's that useful?

Because the feature flags are not loaded through enviroinment variables at the application start but rather they're passed to controller with each request via dependency injection there's no need to restart the application to reload them.

This approach allows for much faster changes to the application's behaviour as there's no need to wait for deployment.
