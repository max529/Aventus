export interface Module {
    namespaces: NamespaceDeclaration[],
    variables: { name: string, start: number, end: number }[];
    classes: ClassModel[];
    functions: FunctionDeclaration[];
    _imports: ImportNode[];
    aliases: AliasNode[];
    enumDeclarations: EnumDeclaration[];
    name: string;
}
export interface NamespaceDeclaration {
    name: string,
    start: number,
    end: number,
    body: {
        start: number,
        end: number
    }
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
    namespace: NamespaceDeclaration
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
    namespace: NamespaceDeclaration;
    extends: TypeModel[];
    decorators: Decorator[];
    name: string;
    type: TypeModel | undefined;
    start: number;
    end: number;
    isExported: boolean;
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
    extends: TypeModel[] = [];
    decorators: Decorator[] = [];
    content: string = "";
    isExported: boolean = false;
    start: number = 0;
    end: number = 0;
    namespace: NamespaceDeclaration = {
        start: 0,
        end: 0,
        name: '',
        body: {
            start: 0,
            end: 0,
        }
    };
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
    filePath: string,
    documentation: string[];
    name: string;
    nameStart: number,
    nameEnd: number,
    content: string;
    constructorBody: string;
    decorators: Decorator[];
    annotations: Annotation[];
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
    namespace: NamespaceDeclaration;
}

let DefaultClassModel: ClassModel = {
    filePath: '',
    documentation: [],
    name: "",
    nameStart: 0,
    nameEnd: 0,
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
    annotationOverridings: {},
    start: 0,
    end: 0,
    namespace: {
        start: 0,
        end: 0,
        name: '',
        body: {
            start: 0,
            end: 0,
        }
    }
}
export { DefaultClassModel }


export function classDecl(name: string, isInteface: boolean): ClassModel {
    return {
        filePath: '',
        documentation: [],
        name: name,
        nameStart: 0,
        nameEnd: 0,
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
        annotationOverridings: {},
        start: 0,
        end: 0,
        namespace: {
            start: 0,
            end: 0,
            name: '',
            body: {
                start: 0,
                end: 0,
            }
        }
    };
}
