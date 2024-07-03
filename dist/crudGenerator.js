"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeCrudToFile = exports.generateCrudOperations = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const generateCrudOperations = (parsedMetadata, typesFile) => {
    const entityTypes = parsedMetadata['edmx:Edmx']['edmx:DataServices'][0]['Schema'][0]['EntityType'];
    const typesImportPath = `../model/${path_1.default.basename(typesFile, '.ts')}`;
    const crudOperations = {};
    entityTypes.forEach((entity) => {
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
exports.generateCrudOperations = generateCrudOperations;
const ensureDirectoryExistence = (filePath) => {
    const dirname = path_1.default.dirname(filePath);
    if (fs_1.default.existsSync(dirname)) {
        return true;
    }
    fs_1.default.mkdirSync(dirname, { recursive: true });
};
const writeCrudToFile = (crudOperations, outputDirectory) => {
    Object.entries(crudOperations).forEach(([typeName, classContent]) => {
        const outputFile = path_1.default.join(outputDirectory, `${typeName}Service.ts`);
        ensureDirectoryExistence(outputFile); // Ensure directory exists
        fs_1.default.writeFileSync(outputFile, classContent, { encoding: 'utf8' });
        console.log(`CRUD operations for ${typeName} written to ${outputFile}`);
    });
};
exports.writeCrudToFile = writeCrudToFile;
