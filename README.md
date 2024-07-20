## Overview

This tool helps you generate types and OData client from OData. The types are extracted through metadata.
The tool locates the manifest.json, extracts the OData service URL, and the server from the ui5.yaml file.

## Installing

To install the tool, use the following npm command:

```
npm i odata-types-generator
```

## Configuration

- Add the following script to your package.json:

```
"scripts": {
    "odata-type-generator": "generate-types"
}
```

- Ensure the server is specified in ui5.yaml under the custom middleware fiori-tools-proxy. If not, you can define the server name in a .env file as SERVER_URL.
- Make sure to include the USERNAME and PASSWORD of the server in the .env file.

## Starting the tool

To start the tool, run the following npm command:

```
npm run odata-type-generator
```
