import { parseStringPromise } from 'xml2js';
import fs from 'fs';

export const parseMetadata = async (xml: string) => {
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


export const generateTypescriptTypes = (parsedMetadata: any): string => {
    const entityTypes = parsedMetadata['edmx:Edmx']['edmx:DataServices'][0]['Schema'][0]['EntityType'];
    const associations = parsedMetadata['edmx:Edmx']['edmx:DataServices'][0]['Schema'][0]['Association'];
    const associationMap = new Map<string, { role: string; type: string }[]>();

    // Map associations to their types
    associations.forEach((association: any) => {
        const associationName = association['$']['Name'];
        const ends = association['End'].map((end: any) => ({
            role: end['$']['Role'],
            type: end['$']['Type'].split('.').pop()
        }));
        associationMap.set(associationName, ends);
    });

    let types = '';

    const entityTypeMap = new Map<string, any>();
    entityTypes.forEach((entity: any) => {
        entityTypeMap.set(entity['$']['Name'], entity);
    });

    entityTypes.forEach((entity: any) => {
        const typeName = entity['$']['Name'];
        let properties = '';
        let keyProperties = '';
        let navigationProperties = '';

        // Add regular properties
        entity['Property'].forEach((property: any) => {
            const propName = property['$']['Name'];
            const propType = property['$']['Type'];
            const isNullable = property['$']['Nullable'] === 'true';

            const typeScriptType = convertToTypescriptType(propType);
            properties += `
    ${propName}: ${typeScriptType};
`;

            if (entity['Key'][0]['PropertyRef'].some((keyProp: any) => keyProp['$']['Name'] === propName)) {
                keyProperties += `
    ${propName}: ${typeScriptType};
`;
            }
        });

        // Add navigation properties
        if (entity['NavigationProperty']) {
            entity['NavigationProperty'].forEach((navProperty: any) => {
                const navPropName = navProperty['$']['Name'];
                const relationship = navProperty['$']['Relationship'].split('.').pop();
                const toRole = navProperty['$']['ToRole'];

                const associationEnds = associationMap.get(relationship);
                if (associationEnds) {
                    const relatedEntityType = associationEnds.find((end) => end.role === toRole)?.type;

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

export interface Editable${typeName} extends Pick<${typeName}, ${entity['Property'].map((property: any) => `"${property['$']['Name']}"`).join(' | ')}> { }
`;
    });

    return types;
};

export const writeTypesToFile = (types: string, outputPath: string) => {
    fs.writeFileSync(outputPath, types, { encoding: 'utf8' });
    console.log(`Types written to ${outputPath}`);
};

export const convertToTypescriptType = (odataType: string): string => {
    switch (odataType) {
        case 'Edm.String':
            return 'string';
        case 'Edm.Int32':
            return 'number';
        default:
            return 'any';
    }
};
