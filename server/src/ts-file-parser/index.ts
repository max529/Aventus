import * as helpers from "./src/helpers";
export * as helpers from "./src/helpers";
import * as tsStructureParser from "./src/tsStructureParser";
export * as tsStructureParser from "./src/tsStructureParser";
export interface Module {
    variables: { name: string, start: number, end: number }[];
    classes: ClassModel[];
    functions: FunctionDeclaration[];
    imports: { [name: string]: Module };
    _imports: ImportNode[];
    aliases: AliasNode[];
    enumDeclarations: EnumDeclaration[];
    name: string;
}
export interface FunctionDeclarationParams {
    name: string,
    type: string,
    mandatory: boolean;
}
export interface FunctionDeclaration {
    name: string;
    isAsync: boolean;
    isArrow: boolean;
    isExport: boolean;
    // returnType?: ReturnTypeDeclaration;
    params?: FunctionDeclarationParams[];
    start: number,
    end: number,
}


export interface ReturnTypeDeclaration {
    isPromise?: boolean;
    isArray?: boolean;
    isUnion?: boolean;
    isLiteral?: boolean;
    value?: any;
    type: string | ReturnTypeDeclaration[] | undefined;

}
export interface AliasNode {
    name: string;
    type: TypeModel | undefined;
    content: string;
}

export interface ImportNode {
    clauses: string[];
    absPathNode: string[];
    absPathString: string;
    isNodeModule: boolean;
}

export class EnumMemberDeclaration {
    name: string = "";
    value?: number | string;
}

export class EnumDeclaration {
    documentation: string[] = [];
    name: string = "";
    members: EnumMemberDeclaration[] = [];
    decorators: Decorator[] = [];
    content: string = "";
    isExported: boolean = false;
    start: number = 0;
    end: number = 0;
}

export enum TypeKind {
    BASIC,
    ARRAY,
    UNION
}

export interface TypeModel {
    typeKind: TypeKind;
    typeName: string;
}

export interface BasicType extends TypeModel {
    //typeName:string
    nameSpace: string;
    basicName: string;
    typeName: string;
    typeArguments: TypeModel[];
    modulePath: string;
}

export interface ArrayType extends TypeModel {
    base: TypeModel;
}

export type Arg = any;

export interface UnionType extends TypeModel {
    options: TypeModel[];
}

export interface Annotation {
    name: string;
    arguments: (Arg | Arg[])[];
}

export interface Decorator {
    name: string;
    arguments: (Arg | Arg[])[];
}


export interface FieldModel {
    name: string;
    type: TypeModel | undefined;
    decorators: Decorator[];
    annotations: Annotation[];
    documentation: string[];
    valueConstraint: Constraint | undefined;
    optional: boolean;
    start: number;
    end: number;
    isStatic: Boolean,
    isPrivate: Boolean,
}

export interface MethodModel {
    start: number;
    end: number;
    name: string;
    text: string;
    returnType: TypeModel | undefined;
    arguments: ParameterModel[];
    isAbstract: Boolean,
    isStatic: Boolean,
    isAsync: Boolean,
    isPrivate: Boolean,
}

export interface ParameterModel {
    start: number;
    end: number;
    name: string;
    text: string;
    type: TypeModel | undefined;
}

export interface Constraint {
    isCallConstraint: boolean;
    value?: any;
}

export interface CallConstraint extends Constraint {
    value: Annotation;
}

export interface ValueConstraint extends Constraint {
    value: string | number | boolean;
}

export interface ClassModel {
    documentation: string[];
    name: string;
    content: string;
    constructorBody: string;
    decorators: Decorator[];
    annotations: Annotation[];
    moduleName: string;
    extends: TypeModel[];
    implements: TypeModel[];

    fields: FieldModel[];

    methods: MethodModel[];

    typeParameters: string[];
    typeParameterConstraint: string[];
    isInterface: boolean;
    isAbstract: boolean;
    isExported: boolean,
    annotationOverridings: { [key: string]: Annotation[] };
    start: number,
    end: number,
}

let DefaultClassModel: ClassModel = {
    documentation: [],
    name: "",
    content: "",
    constructorBody: "",
    methods: [],
    typeParameters: [],
    typeParameterConstraint: [],
    implements: [],
    fields: [],
    isInterface: false,
    isAbstract: false,
    isExported: false,
    decorators: [],
    annotations: [],
    extends: [],
    moduleName: '',
    annotationOverridings: {},
    start: 0,
    end: 0
}
export { DefaultClassModel }

export function classDecl(name: string, isInteface: boolean): ClassModel {
    return {
        documentation: [],
        name: name,
        content: "",
        constructorBody: "",
        methods: [],
        typeParameters: [],
        typeParameterConstraint: [],
        implements: [],
        fields: [],
        isInterface: isInteface,
        isAbstract: false,
        isExported: false,
        decorators: [],
        annotations: [],
        extends: [],
        moduleName: '',
        annotationOverridings: {},
        start: 0,
        end: 0
    };
}
