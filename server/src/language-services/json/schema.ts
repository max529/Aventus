export const AventusConfigSchema = {
    "$schema": "foo://aventus/conf.json",
    "title": "JSON Schema for Aventus",
    "description": "JSON Schema for Aventus",
    "type": "object",
    "additionalProperties": false,
    "properties": {
        "build": {
            type: "array",
            items: {
                type: "object",
                properties: {
                    "name": { type: "string" },
                    "version": {
                        type: "string",
                        pattern: "^[0-9]+\.[0-9]+\.[0-9]+$"
                    },
                    "componentPrefix": {
                        type: "string",
                        description: "Identifier to prefix all your components (case sensitive)",
                        minLength: 2
                    },
                    "inputPath": {
                        type: "array",
                        items: { type: "string" },
                    },
                    "outsideModulePath": {
                        type: "array",
                        items: { type: "string" },
                    },
                    "outputFile": { type: "string" },
                    "generateDefinition": { type: "boolean" },
                    "compileOnSave": { type: "boolean" },
                    "includeBase": { type: "boolean" },
                    "includeOnBuild": {
                        type: "array",
                        items: {
                            type: "string",
                        },
                    },
                    "module": { type: "string" }
                },
                required: ["name", "inputPath", "outputFile", "componentPrefix", "module"],
                additionalProperties: false
            },
            minItems: 1
        },
        "include": {
            type: "array",
            items: {
                type: "object",
                properties: {
                    "definition": { type: "string" },
                    "src": { type: "string" },
                    "name": { type: "string" }
                },
                required: ["definition", "name"],
                additionalProperties: false
            }
        },
        "static": {
            type: "array",
            items: {
                type: "object",
                properties: {
                    "name": { type: "string" },
                    "inputPath": { type: "string" },
                    "outputPath": { type: "string" },
                    "exportOnChange": { type: "boolean" },
                    "colorsMap": {
                        type: "object",
                        description: "Color to map when transpile svg"
                    }
                },
                required: ["name", "inputPath", "outputPath"],
                additionalProperties: false
            }
        },
    },
    "required": ["build"]
};