import { fetchMetadata } from './utils';
import { generateTypescriptTypes, parseMetadata, writeTypesToFile } from './metadataType';
import { generateCrudOperations, writeCrudToFile } from './crudGenerator';
import path from 'path';
import fs from 'fs';

const OUTPUT_FILE = 'webapp/model/metadataTypes.ts';
const CRUD_FILE = 'webapp/client';

const ensureDirectoryExistence = (filePath: string) => {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    fs.mkdirSync(dirname, { recursive: true });
};

const mainFun = async (metadataUrl: string, username: string, password: string) => {
    try {
        const metadataXml = await fetchMetadata(metadataUrl, username, password);
        const parsedMetadata = await parseMetadata(metadataXml);

        ensureDirectoryExistence(OUTPUT_FILE);
        ensureDirectoryExistence(CRUD_FILE);

        const typescriptTypes = generateTypescriptTypes(parsedMetadata);
        writeTypesToFile(typescriptTypes, OUTPUT_FILE);
        
        const crudOperations = generateCrudOperations(parsedMetadata, OUTPUT_FILE);
        writeCrudToFile(crudOperations, CRUD_FILE);

        console.log('CRUD operations generated successfully.');

    } catch (error) {
        console.error('An error occurred in the main function:', error);
    }
};

// Execute mainFun with command line arguments
mainFun(process.argv[2], process.argv[3], process.argv[4]).catch(error => console.error(error));

// Export mainFun as main
export const main = mainFun;
