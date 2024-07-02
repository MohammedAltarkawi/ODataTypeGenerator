import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const OUTPUT_FILE = 'metadataTypes.ts';

const fetchMetadata = async (METADATA_URL: string, USERNAME: string, PASSWORD: string) => {
    try {
        console.log('Attempting to fetch metadata...');
        const response = await axios.get(METADATA_URL, {
            auth: {
                username: USERNAME,
                password: PASSWORD
            }
        });
        console.log('Metadata fetched successfully');
        return response.data;
    } catch (error) {
        console.error('Error fetching metadata:', error);
        throw error;
    }
};

const parseMetadata = async (xml: string) => {
    try {
        console.log('Attempting to parse metadata...');
        const result = await parseStringPromise(xml);
        console.log('Metadata parsed successfully');
        return result;
    } catch (error) {
        console.error('Error parsing metadata:', error);
        throw error;
    }
};

const generateTypescriptTypes = (parsedMetadata: any): string => {
    const entityTypes = parsedMetadata['edmx:Edmx']['edmx:DataServices'][0]['Schema'][0]['EntityType'];
    let types = '';

    entityTypes.forEach((entity: any) => {
        const typeName = entity['$']['Name'];
        let properties = '';
        let keyProperties = '';
        let navigationProperties = '';

        entity['Property'].forEach((property: any) => {
            const propName = property['$']['Name'];
            const propType = property['$']['Type'];
            const isNullable = property['$']['Nullable'] === 'true';

            const typeScriptType = convertToTypescriptType(propType);
            properties += `
    /**
     * OData Attributes:
     * |Attribute Name | Attribute Value |
     * | --- | ---|
     * | Name | \`${propName}\` |
     * | Type | \`${propType}\` |
     * | Nullable | \`${isNullable}\` |
     */
    ${propName}: ${typeScriptType};
`;

            if (entity['Key'][0]['PropertyRef'].some((keyProp: any) => keyProp['$']['Name'] === propName)) {
                keyProperties += `
    ${propName}: ${typeScriptType};
`;
            }
        });

        if (entity['NavigationProperty']) {
            entity['NavigationProperty'].forEach((navProperty: any) => {
                const navPropName = navProperty['$']['Name'];
                const navPropType = navProperty['$']['Type']; // Placeholder for the actual type
                const toRole = navProperty['$']['ToRole'];
                const relationship = navProperty['$']['Relationship'];

                navigationProperties += `
    ${navPropName}?: ${navPropType}[]; // Replace with actual type
`;
            });
        }

        types += `
export interface ${typeName} {${properties}${navigationProperties}
}

export type ${typeName}Id = {${keyProperties}
}

export interface Editable${typeName} extends Pick<${typeName}, ${Object.keys(entity['Property']).map(key => `"${entity['Property'][key]['$']['Name']}"`).join(' | ')}> { }
`;
    });

    return types;
};

const convertToTypescriptType = (odataType: string): string => {
    switch (odataType) {
        case 'Edm.String':
            return 'string';
        case 'Edm.Int32':
            return 'number';
        case 'Edm.Boolean':
            return 'boolean';
        // Add more OData type mappings as needed
        default:
            return 'any';
    }
};

const writeTypesToFile = (types: string) => {
    fs.writeFileSync(OUTPUT_FILE, types, { encoding: 'utf8' });
    console.log(`Types written to ${OUTPUT_FILE}`);
};

const mainFun = async (metadataUrl: string, username: string, password: string) => {
    try {
        const metadataXml = await fetchMetadata(metadataUrl, username, password);
        const parsedMetadata = await parseMetadata(metadataXml);
        const typescriptTypes = generateTypescriptTypes(parsedMetadata);
        writeTypesToFile(typescriptTypes);
    } catch (error) {
        console.error('An error occurred in the main function:', error);
    }
};

mainFun(process.argv[2], process.argv[3], process.argv[4]).catch(error => console.error(error));

export const main = mainFun;
