#!/usr/bin/env node
console.log('Running odatatypegenerator...');
const { main } = require('../dist/index');

const metadataUrl = process.argv[2];
const username = process.argv[3];
const password = process.argv[4];

//main().catch(error => console.error(error));
main(metadataUrl, username, password).catch(error => console.error(error));