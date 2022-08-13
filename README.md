# Aventus

![Aventus logo](https://raw.githubusercontent.com/aventus/master/icons/aventus.gif "Aventus")

Aventus is a framework for simplifying the creation and maintenance of a web application. It is based on web components for the design as well as creation patterns to manage data in the best possible way.

Aventus is only available on the Visual Studio Code IDE

## Configuration

All aventus project is defined by his file : aventus.conf.json

```json
{  
    "identifier": "Av", // identifier for your project
    "components": { // (optional)
        "disableIdentifier": false // (optional) disable identifier at the beginning of web components
    },
    "data": { // (optional)
        "disableIdentifier": false // (optional) disable identifier at the beginning of data
    },
    "libs": { // (optional)
        "disableIdentifier": false // (optional) disable identifier at the beginning of libraries
    },
    "ram": { // (optional)
        "disableIdentifier": false // (optional) disable identifier at the beginning of ram
    },
    "build": [
        {
            "name": "My first build", // name of your build
            "inputPath": [
                "./src/" // all input path to compile
            ],
            "outputFile": "./out/data.js", // output file
            "compileOnSave": true, // (optional) compile when file is saved
            "generateDefinition": true, // (optional) if the compiler must generate definition to import your project
            "includeBase": true, // (optional) include aventus base lib
            "namespace": "Aventus", // (optional) if set your code will be reachable under $namespace.YourClass
            "include": [] // (optional) include other project
        }
    ],
    "static": [ // (optional) allow you to copy static data => if SCSS => transform into CSS
        {
            "name": "My first static folder",
            "inputPath": "./src/static",
            "outputPath": "./out"
        }
    ]
}
```

## File Extension

### Web Component

To create a web component you need at least 3 files in the same folder

1. *.wcl.avt => Web Component Logic : Logic in TS for your component
2. *.wcv.avt => Web Component View : View in HTML for your component
3. *.wcs.avt => Web Component Style : Style in SCSS for your component

### Data

A *.data.avt file is a class / interface / enum representing usable objects for your application

Classes must implement Data and interfaces must extend IData

```ts
export class ExampleData implements Data

export interface ExampleInterface extends IData
```

### RAM

A *.ram.avt file is a class extending RAMManager. It's a store for your data

### Library

A *.lib.avt file allow you to create some logical part for your project without web component. There is no restriction for the file

### Static

A *.static.avt file is a file not compiled by the system. The content of the file is just copy/paste in the final JS file.

### Definition

A *.def.avt file is a file representing definition for a project. It allows you to use other project in your.

## VS Code Settings 
Edit settings.json and add

```json
"emmet.includeLanguages": {
    "Aventus HTML": "html" // allow emmet in *.wcv.avt
}

"[Aventus HTML]": {
    "editor.snippetSuggestions": "top" // allow aventus suggestion first
}
```