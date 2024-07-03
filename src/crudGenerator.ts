import fs from 'fs';
import path from 'path';

export const generateCrudOperations = (parsedMetadata: any, typesFile: string): { [typeName: string]: string } => {
    const entityTypes = parsedMetadata['edmx:Edmx']['edmx:DataServices'][0]['Schema'][0]['EntityType'];
    const typesImportPath = `../model/${path.basename(typesFile, '.ts')}`;

    const crudOperations: { [typeName: string]: string } = {};

    entityTypes.forEach((entity: any) => {
        const typeName = entity['$']['Name'];
        let classTemplate = `import ODataModel from 'sap/ui/model/odata/v2/ODataModel';\n`;
        classTemplate += `import { ${typeName} } from '${typesImportPath}';\n\n`;
        classTemplate += `export class ${typeName}Service {\n`;
        classTemplate += `    private oModel: ODataModel;\n\n`;
        classTemplate += `    constructor(oModel: ODataModel) {\n`;
        classTemplate += `        this.oModel = oModel;\n`;
        classTemplate += `    }\n\n`;

        classTemplate += `    async getAll(): Promise<${typeName}[]> {\n`;
        classTemplate += `        return new Promise((resolve, reject) => {\n`;
        classTemplate += `            this.oModel.read('/${typeName}', {\n`;
        classTemplate += `                success: (data: any) => resolve(data.results),\n`;
        classTemplate += `                error: (error: any) => reject(error)\n`;
        classTemplate += `            });\n`;
        classTemplate += `        });\n`;
        classTemplate += `    }\n\n`;

        classTemplate += `    async getById(id: any): Promise<${typeName}> {\n`;
        classTemplate += `        return new Promise((resolve, reject) => {\n`;
        classTemplate += `            this.oModel.read(\`/${typeName}(\${id})\`, {\n`;
        classTemplate += `                success: (data: any) => resolve(data),\n`;
        classTemplate += `                error: (error: any) => reject(error)\n`;
        classTemplate += `            });\n`;
        classTemplate += `        });\n`;
        classTemplate += `    }\n\n`;

        classTemplate += `    async create(entity: ${typeName}): Promise<void> {\n`;
        classTemplate += `        return new Promise((resolve, reject) => {\n`;
        classTemplate += `            this.oModel.create('/${typeName}', entity, {\n`;
        classTemplate += `                success: () => resolve(),\n`;
        classTemplate += `                error: (error: any) => reject(error)\n`;
        classTemplate += `            });\n`;
        classTemplate += `        });\n`;
        classTemplate += `    }\n\n`;

        classTemplate += `    async update(id: any, entity: ${typeName}): Promise<void> {\n`;
        classTemplate += `        return new Promise((resolve, reject) => {\n`;
        classTemplate += `            this.oModel.update(\`/${typeName}(\${id})\`, entity, {\n`;
        classTemplate += `                success: () => resolve(),\n`;
        classTemplate += `                error: (error: any) => reject(error)\n`;
        classTemplate += `            });\n`;
        classTemplate += `        });\n`;
        classTemplate += `    }\n\n`;

        classTemplate += `    async delete(id: any): Promise<void> {\n`;
        classTemplate += `        return new Promise((resolve, reject) => {\n`;
        classTemplate += `            this.oModel.remove(\`/${typeName}(\${id})\`, {\n`;
        classTemplate += `                success: () => resolve(),\n`;
        classTemplate += `                error: (error: any) => reject(error)\n`;
        classTemplate += `            });\n`;
        classTemplate += `        });\n`;
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
