import fs from 'fs';
import path from 'path';


export const generateCrudOperations = (parsedMetadata: any, typesFile: string): { [typeName: string]: string } => {
    const entityTypes = parsedMetadata['edmx:Edmx']['edmx:DataServices'][0]['Schema'][0]['EntityType'];
    const associations = parsedMetadata['edmx:Edmx']['edmx:DataServices'][0]['Schema'][0]['Association'];
    const typesImportPath = `../model/${path.basename(typesFile, '.ts')}`;

    const crudOperations: { [typeName: string]: string } = {};

    const associationMap = new Map<string, any[]>();
    associations.forEach((association: any) => {
        const associationName = association['$']['Name'];
        const ends = association['End'].map((end: any) => ({
            role: end['$']['Role'],
            type: end['$']['Type'].split('.').pop(),
        }));
        associationMap.set(associationName, ends);
    });

    entityTypes.forEach((entity: any) => {
        const typeName = entity['$']['Name'];
        const typeNameSet =  `${typeName}Set`;
        const idTypeName = `${typeName}Id`;

        let classTemplate = `import ODataModel from "sap/ui/model/odata/v2/ODataModel";\n`;
        classTemplate += `import { ${typeName}, ${idTypeName} } from '${typesImportPath}';\n`;

        // Collect navigation property types for import
        let navImports = new Set<string>();

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
                        navImports.add(relatedEntityType);
                    }
                }
            });
        }

        // Add navigation property imports
        navImports.forEach((navImport) => {
            classTemplate += `import { ${navImport} } from '${typesImportPath}';\n`;
        });

        classTemplate += `\nexport class ${typeName}Service {\n`;
        classTemplate += `    private oModel: ODataModel;\n\n`;
        classTemplate += `    constructor(oModel: ODataModel) {\n`;
        classTemplate += `        this.oModel = oModel;\n`;
        classTemplate += `    }\n\n`;

        classTemplate += `    async getAll(): Promise<${typeName}[]> {\n`;
        classTemplate += `        return new Promise((resolve, reject) => {\n`;
        classTemplate += `            this.oModel.read('/${typeNameSet}', {\n`;
        classTemplate += `                success: (data: any) => resolve(data.results),\n`;
        classTemplate += `                error: (error: any) => reject(error)\n`;
        classTemplate += `            });\n`;
        classTemplate += `        });\n`;
        classTemplate += `    }\n\n`;

        classTemplate += `    async getById(id: ${idTypeName}): Promise<${typeName}> {\n`;
        classTemplate += `        return new Promise((resolve, reject) => {\n`;
        classTemplate += `            this.oModel.read(\`/${typeNameSet}(\${this.idToQueryString(id)})\`, {\n`;
        classTemplate += `                success: (data: any) => resolve(data),\n`;
        classTemplate += `                error: (error: any) => reject(error)\n`;
        classTemplate += `            });\n`;
        classTemplate += `        });\n`;
        classTemplate += `    }\n\n`;

        classTemplate += `    async create(entity: ${typeName}): Promise<void> {\n`;
        classTemplate += `        return new Promise((resolve, reject) => {\n`;
        classTemplate += `            this.oModel.create('/${typeNameSet}', entity, {\n`;
        classTemplate += `                success: () => resolve(),\n`;
        classTemplate += `                error: (error: any) => reject(error)\n`;
        classTemplate += `            });\n`;
        classTemplate += `        });\n`;
        classTemplate += `    }\n\n`;

        classTemplate += `    async update(id: ${idTypeName}, entity: ${typeName}): Promise<void> {\n`;
        classTemplate += `        return new Promise((resolve, reject) => {\n`;
        classTemplate += `            this.oModel.update(\`/${typeNameSet}(\${this.idToQueryString(id)})\`, entity, {\n`;
        classTemplate += `                success: () => resolve(),\n`;
        classTemplate += `                error: (error: any) => reject(error)\n`;
        classTemplate += `            });\n`;
        classTemplate += `        });\n`;
        classTemplate += `    }\n\n`;

        classTemplate += `    async delete(id: ${idTypeName}): Promise<void> {\n`;
        classTemplate += `        return new Promise((resolve, reject) => {\n`;
        classTemplate += `            this.oModel.remove(\`/${typeNameSet}(\${this.idToQueryString(id)})\`, {\n`;
        classTemplate += `                success: () => resolve(),\n`;
        classTemplate += `                error: (error: any) => reject(error)\n`;
        classTemplate += `            });\n`;
        classTemplate += `        });\n`;
        classTemplate += `    }\n\n`;

        // Handle navigation properties
        if (entity['NavigationProperty']) {
            entity['NavigationProperty'].forEach((navProperty: any) => {
                const navPropName = navProperty['$']['Name'];
                const relationship = navProperty['$']['Relationship'].split('.').pop();
                const toRole = navProperty['$']['ToRole'];
                

                const associationEnds = associationMap.get(relationship);
                if (associationEnds) {
                    const relatedEntityType = associationEnds.find((end) => end.role === toRole)?.type;
                    const capNavProperty = relatedEntityType.charAt(0).toUpperCase() + relatedEntityType.slice(1);
                    const capProperty = typeName.charAt(0).toUpperCase() + typeName.slice(1);
                    if (relatedEntityType) {
                        const navPropFunctionName = `get${capNavProperty}By${capProperty}`;
                        classTemplate += `    async ${navPropFunctionName}(id: ${idTypeName}): Promise<${relatedEntityType}[]> {\n`;
                        classTemplate += `        return new Promise((resolve, reject) => {\n`;
                        classTemplate += `            this.oModel.read(\`/${typeNameSet}(\${this.idToQueryString(id)})/${navPropName}\`, {\n`;
                        classTemplate += `                success: (data: any) => resolve(data.results),\n`;
                        classTemplate += `                error: (error: any) => reject(error)\n`;
                        classTemplate += `            });\n`;
                        classTemplate += `        });\n`;
                        classTemplate += `    }\n\n`;
                    }
                }
            });
        }

        classTemplate += `    private idToQueryString(id: ${idTypeName}): string {\n`;
        classTemplate += `        return Object.entries(id).map(([key, value]) => \`\${key}='\${value}'\`).join(',');\n`;
        classTemplate += `    }\n`;

        classTemplate += `}\n`;

        crudOperations[typeName] = classTemplate;
    });

    return crudOperations;
};

const ensureDirectoryExistence = (filePath: string) => {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    fs.mkdirSync(dirname, { recursive: true });
};

export const writeCrudToFile = (crudOperations: { [typeName: string]: string }, outputDirectory: string) => {
    Object.entries(crudOperations).forEach(([typeName, classContent]) => {
        const outputFile = path.join(outputDirectory, `${typeName}Service.ts`);
        ensureDirectoryExistence(outputFile); // Ensure directory exists
        fs.writeFileSync(outputFile, classContent, { encoding: 'utf8' });
        console.log(`CRUD operations for ${typeName} written to ${outputFile}`);
    });
};
