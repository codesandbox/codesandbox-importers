# codesandbox-cli

> Upload your templates to codesandbox with a single command 🏖️

[![Build Status](https://travis-ci.org/codesandbox/codesandbox-cli.svg?branch=master)](https://travis-ci.org/codesandbox/codesandbox-cli)

This is the command line interface for [CodeSandbox](https://codesandbox.io), an online editor
tailored for web applications.

## Quickstart

You can install the cli by running

```bash
# Install the cli
npm i -g codesandbox

# Go to your project
cd <path of your project>

# Deploy your project to CodeSandbox
codesandbox ./
```

## Future features

- Create a live connection with CodeSandbox using websockets so you can use your local editor

## Current limitations

- You need to be signed in to GitHub, this is to prevent abuse
- Accounts without the GitHub integration setup cannot use this tool
- You cannot sign in with Google

## Inspiration

I took a lot of inspiration from [now-cli](https://github.com/zeit/now-cli) and [preact-cli](https://github.com/developit/preact-cli) while building this.
