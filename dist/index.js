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
const utils_1 = require("./utils");
const metadataType_1 = require("./metadataType");
const crudGenerator_1 = require("./crudGenerator");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const OUTPUT_FILE = 'webapp/model/metadataTypes.ts';
const CRUD_FILE = 'webapp/client';
const ensureDirectoryExistence = (filePath) => {
    const dirname = path_1.default.dirname(filePath);
    if (fs_1.default.existsSync(dirname)) {
        return true;
    }
    fs_1.default.mkdirSync(dirname, { recursive: true });
};
const mainFun = (metadataUrl, username, password) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const metadataXml = yield (0, utils_1.fetchMetadata)(metadataUrl, username, password);
        const parsedMetadata = yield (0, metadataType_1.parseMetadata)(metadataXml);
        ensureDirectoryExistence(OUTPUT_FILE);
        ensureDirectoryExistence(CRUD_FILE);
        const typescriptTypes = (0, metadataType_1.generateTypescriptTypes)(parsedMetadata);
        (0, metadataType_1.writeTypesToFile)(typescriptTypes, OUTPUT_FILE);
        const crudOperations = (0, crudGenerator_1.generateCrudOperations)(parsedMetadata, OUTPUT_FILE);
        (0, crudGenerator_1.writeCrudToFile)(crudOperations, CRUD_FILE);
        console.log('CRUD operations generated successfully.');
    }
    catch (error) {
        console.error('An error occurred in the main function:', error);
    }
});
// Execute mainFun with command line arguments
mainFun(process.argv[2], process.argv[3], process.argv[4]).catch(error => console.error(error));
// Export mainFun as main
exports.main = mainFun;
