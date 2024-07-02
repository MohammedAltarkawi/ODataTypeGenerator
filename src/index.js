"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const axios_1 = __importDefault(require("axios"));
const xml2js_1 = require("xml2js");
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const OUTPUT_FILE = 'metadataTypes.ts';
const fetchMetadata = (METADATA_URL, USERNAME, PASSWORD) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Attempting to fetch metadata...');
        const response = yield axios_1.default.get(METADATA_URL, {
            auth: {
                username: USERNAME,
                password: PASSWORD
            }
        });
        console.log('Metadata fetched successfully');
        return response.data;
    }
    catch (error) {
        console.error('Error fetching metadata:', error);
        throw error;
    }
});
const parseMetadata = (xml) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Attempting to parse metadata...');
        const result = yield (0, xml2js_1.parseStringPromise)(xml);
        console.log('Metadata parsed successfully');
        return result;
    }
    catch (error) {
        console.error('Error parsing metadata:', error);
        throw error;
    }
});
const generateTypescriptTypes = (parsedMetadata) => {
    const entityTypes = parsedMetadata['edmx:Edmx']['edmx:DataServices'][0]['Schema'][0]['EntityType'];
    const associations = parsedMetadata['edmx:Edmx']['edmx:DataServices'][0]['Schema'][0]['Association'];
    const associationMap = new Map();
    // Map associations to their types
    associations.forEach((association) => {
        const associationName = association['$']['Name'];
        const ends = association['End'].map((end) => ({
            role: end['$']['Role'],
            type: end['$']['Type'].split('.').pop()
        }));
        associationMap.set(associationName, ends);
    });
    let types = '';
    const entityTypeMap = new Map();
    entityTypes.forEach((entity) => {
        entityTypeMap.set(entity['$']['Name'], entity);
    });
    entityTypes.forEach((entity) => {
        const typeName = entity['$']['Name'];
        let properties = '';
        let keyProperties = '';
        let navigationProperties = '';
        // Add regular properties
        entity['Property'].forEach((property) => {
            const propName = property['$']['Name'];
            const propType = property['$']['Type'];
            const isNullable = property['$']['Nullable'] === 'true';
            const typeScriptType = convertToTypescriptType(propType);
            properties += `
    /**
     * OData Attributes:
     * | Attribute Name | Attribute Value |
     * | --- | --- |
     * | Name | \`${propName}\` |
     * | Type | \`${propType}\` |
     * | Nullable | \`${isNullable}\` |
     */
    ${propName}: ${typeScriptType};
`;
            if (entity['Key'][0]['PropertyRef'].some((keyProp) => keyProp['$']['Name'] === propName)) {
                keyProperties += `
    ${propName}: ${typeScriptType};
`;
            }
        });
        // Add navigation properties
        if (entity['NavigationProperty']) {
            entity['NavigationProperty'].forEach((navProperty) => {
                var _a;
                const navPropName = navProperty['$']['Name'];
                const relationship = navProperty['$']['Relationship'].split('.').pop();
                const toRole = navProperty['$']['ToRole'];
                const associationEnds = associationMap.get(relationship);
                if (associationEnds) {
                    const relatedEntityType = (_a = associationEnds.find((end) => end.role === toRole)) === null || _a === void 0 ? void 0 : _a.type;
                    if (relatedEntityType) {
                        navigationProperties += `
    ${navPropName}: ${relatedEntityType}[];
`;
                    }
                }
            });
        }
        types += `
export interface ${typeName} {${properties}${navigationProperties}
}

export type ${typeName}Id = {${keyProperties}
}

export interface Editable${typeName} extends Pick<${typeName}, ${entity['Property'].map((property) => `"${property['$']['Name']}"`).join(' | ')}> { }
`;
    });
    return types;
};
const convertToTypescriptType = (odataType) => {
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
const writeTypesToFile = (types) => {
    fs_1.default.writeFileSync(OUTPUT_FILE, types, { encoding: 'utf8' });
    console.log(`Types written to ${OUTPUT_FILE}`);
};
const mainFun = (metadataUrl, username, password) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const metadataXml = yield fetchMetadata(metadataUrl, username, password);
        const parsedMetadata = yield parseMetadata(metadataXml);
        const typescriptTypes = generateTypescriptTypes(parsedMetadata);
        writeTypesToFile(typescriptTypes);
    }
    catch (error) {
        console.error('An error occurred in the main function:', error);
    }
});
mainFun(process.argv[2], process.argv[3], process.argv[4]).catch(error => console.error(error));
exports.main = mainFun;
