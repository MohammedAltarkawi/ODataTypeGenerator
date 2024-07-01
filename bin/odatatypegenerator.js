#!/usr/bin/env node
console.log('Running odatatypegenerator...');
const { main } = require('../src/index');

main().catch(error => console.error(error));