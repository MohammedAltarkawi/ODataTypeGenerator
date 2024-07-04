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
exports.convertToTypescriptType = exports.writeTypesToFile = exports.generateTypescriptTypes = exports.parseMetadata = void 0;
const xml2js_1 = require("xml2js");
const fs_1 = __importDefault(require("fs"));
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
exports.parseMetadata = parseMetadata;
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
            const typeScriptType = (0, exports.convertToTypescriptType)(propType);
            properties += `
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
`;
    });
    return types;
};
exports.generateTypescriptTypes = generateTypescriptTypes;
//export interface Editable${typeName} extends Pick<${typeName}, ${entity['Property'].map((property: any) => `"${property['$']['Name']}"`).join(' | ')}> { }
const writeTypesToFile = (types, outputPath) => {
    fs_1.default.writeFileSync(outputPath, types, { encoding: 'utf8' });
    console.log(`Types written to ${outputPath}`);
};
exports.writeTypesToFile = writeTypesToFile;
const convertToTypescriptType = (odataType) => {
    switch (odataType) {
        case 'Edm.String':
            return 'string';
        case 'Edm.Int32':
            return 'number';
        default:
            return 'any';
    }
};
exports.convertToTypescriptType = convertToTypescriptType;
