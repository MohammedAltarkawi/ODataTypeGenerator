#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const dotenv = require('dotenv');
const axios = require('axios');
const { execSync } = require('child_process');

// Load .env file if it exists
dotenv.config();

const log = (message) => {
    console.log(`[INFO] ${message}`);
};

const logError = (message) => {
    console.error(`[ERROR] ${message}`);
};

// Function to dynamically find the manifest.json file
const findManifest = () => {
    let currentDir = __dirname;

    // Traverse upwards until we find the webapp directory
    while (true) {
        const manifestPath = path.join(currentDir, '../webapp/manifest.json');
        if (fs.existsSync(manifestPath)) {
            return manifestPath;
        }

        const parentDir = path.dirname(currentDir);
        // Check if we have reached the root directory
        if (parentDir === currentDir) {
            throw new Error('Manifest file not found.');
        }

        currentDir = parentDir;
    }
};

try {
    // Read the manifest.json
    log('Reading manifest.json...');
    const manifestPath = findManifest();
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // Extract the local URI for the metadata from the manifest
    const metadataLocalUri = manifest['sap.app']['dataSources']['mainService']['uri']; // Adjust this path as necessary
    log(`Extracted metadataLocalUri: ${metadataLocalUri}`);

    // Function to find ui5.yaml
    const findUi5Yaml = () => {
        let currentDir = path.dirname(manifestPath);

        // Traverse upwards until we find ui5.yaml
        while (true) {
            const ui5YamlPath = path.join(currentDir, 'ui5.yaml');
            if (fs.existsSync(ui5YamlPath)) {
                return ui5YamlPath;
            }

            const parentDir = path.dirname(currentDir);
            // Check if we have reached the root directory
            if (parentDir === currentDir) {
                throw new Error('ui5.yaml file not found.');
            }

            currentDir = parentDir;
        }
    };

    // Read the ui5.yaml for the server URL
    log('Reading ui5.yaml...');
    const ui5YamlPath = findUi5Yaml();
    const ui5Yaml = yaml.load(fs.readFileSync(ui5YamlPath, 'utf8'));

    // Extract the server URL
    let serverUrl = null;
    try {
        const backendEntry = ui5Yaml.server.customMiddleware.find(mw => mw.name === 'fiori-tools-proxy');
        serverUrl = backendEntry.configuration.backend.find(entry => entry.path === '/sap').url;
        log(`Extracted serverUrl from ui5.yaml: ${serverUrl}`);
    } catch (error) {
        logError('Server URL not found in ui5.yaml, falling back to .env');
    }

    // Fallback to .env if server URL is not found
    if (!serverUrl) {
        serverUrl = process.env.SERVER_URL;
        if (!serverUrl) {
            logError('Server URL not found in both ui5.yaml and .env');
            process.exit(1);
        } else {
            log(`Extracted serverUrl from .env: ${serverUrl}`);
        }
    }

    // Combine to form the complete metadata URL
    const formattedServerUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
    const formattedMetadataUri = metadataLocalUri.startsWith('/') ? metadataLocalUri.slice(1) : metadataLocalUri;
    const metadataUrl = `${formattedServerUrl}/${formattedMetadataUri}$metadata`;
    log(`Constructed metadataUrl: ${metadataUrl}`);

    // Read the auth.json (or other file) for the username and password
    const authPath = path.join(__dirname, '../auth.json'); // Adjust the path to auth.json as necessary
    let username = null;
    let password = null;
    try {
        log('Reading auth.json...');
        const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
        username = auth.username;
        password = auth.password;
        log('Extracted username and password from auth.json');
    } catch (error) {
        logError('Auth details not found in auth.json, falling back to .env');
    }

    // Fallback to .env if auth details are not found
    if (!username || !password) {
        username = process.env.USERNAME;
        password = process.env.PASSWORD;
        if (!username || !password) {
            logError('Auth details not found in both auth.json and .env');
            process.exit(1);
        } else {
            log('Extracted username and password from .env');
        }
    }

    // Check if the metadata URL is accessible and returns the expected data
    const checkMetadataUrl = async (url, username, password) => {
        log('Checking metadata URL...');
        try {
            const response = await axios.get(url, {
                auth: {
                    username,
                    password
                }
            });
            if (response.status === 200) {
                log('Metadata URL is valid');
                return true;
            }
        } catch (error) {
            logError('Error fetching metadata:', error);
        }
        return false;
    };

    (async () => {
        const isValid = await checkMetadataUrl(metadataUrl, username, password);
        if (!isValid) {
            logError('Metadata URL is not valid or not accessible');
            process.exit(1);
        }

        // Call the odatatypegenerator with the extracted values
        try {
            log('Running odatatypegenerator...');
            execSync(`npx odatatypegenerator ${metadataUrl} ${username} ${password}`, { stdio: 'inherit' });
            log('odatatypegenerator ran successfully');
        } catch (error) {
            logError('Error running odatatypegenerator:', error);
            process.exit(1);
        }
    })();
} catch (error) {
    logError('An error occurred:', error);
    process.exit(1);
}
