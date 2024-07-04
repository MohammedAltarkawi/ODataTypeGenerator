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
    const associations = parsedMetadata['edmx:Edmx']['edmx:DataServices'][0]['Schema'][0]['Association'];
    const typesImportPath = `../model/${path_1.default.basename(typesFile, '.ts')}`;
    const crudOperations = {};
    const associationMap = new Map();
    associations.forEach((association) => {
        const associationName = association['$']['Name'];
        const ends = association['End'].map((end) => ({
            role: end['$']['Role'],
            type: end['$']['Type'].split('.').pop(),
        }));
        associationMap.set(associationName, ends);
    });
    entityTypes.forEach((entity) => {
        const typeName = entity['$']['Name'];
        const typeNameSet = `${typeName}Set`;
        const idTypeName = `${typeName}Id`;
        let classTemplate = `import ODataModel from "sap/ui/model/odata/v2/ODataModel";\n`;
        classTemplate += `import { ${typeName}, ${idTypeName} } from '${typesImportPath}';\n`;
        // Collect navigation property types for import
        let navImports = new Set();
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
            entity['NavigationProperty'].forEach((navProperty) => {
                var _a;
                const navPropName = navProperty['$']['Name'];
                const relationship = navProperty['$']['Relationship'].split('.').pop();
                const toRole = navProperty['$']['ToRole'];
                const associationEnds = associationMap.get(relationship);
                if (associationEnds) {
                    const relatedEntityType = (_a = associationEnds.find((end) => end.role === toRole)) === null || _a === void 0 ? void 0 : _a.type;
                    if (relatedEntityType) {
                        const navPropFunctionName = `get${relatedEntityType}By${typeName}`;
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
