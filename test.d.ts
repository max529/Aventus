declare global {
	declare namespace Aventus {
		interface IRAMManager {
		}
		abstract class RAMManager<U extends IDataConstraint<U>> implements IRAMManager {
			private static allRams;
			protected static _getInstance<T extends IRAMManager>(): T;
			protected records: {
				[key: number]: U;
			};
			abstract getPrimaryKey(): string;
			getId(item: IDataConstraint<U>): number | undefined;
			protected constructor();
			createList(list: U[]): Promise<U[]>;
			create(item: U, ...args: any[]): Promise<U | undefined>;
			private _create;
			protected beforeCreateList(list: U[]): Promise<U[]>;
			protected beforeCreateItem(item: U, fromList: boolean): Promise<U>;
			protected afterCreateItem(item: U, fromList: boolean): Promise<U>;
			protected afterCreateList(list: U[]): Promise<U[]>;
			updateList(list: U[]): Promise<U[]>;
			update(item: U, ...args: any[]): Promise<U | undefined>;
			private _update;
			protected beforeUpdateList(list: U[]): Promise<U[]>;
			protected beforeUpdateItem(item: U, fromList: boolean): Promise<U>;
			protected afterUpdateItem(item: U, fromList: boolean): Promise<U>;
			protected afterUpdateList(list: U[]): Promise<U[]>;
			protected updateDataInRAM(newData: U | {}): void;
			deleteList(list: U[]): Promise<void>;
			delete(item: U, ...args: any[]): Promise<void>;
			deleteById(id: number): Promise<void>;
			private _delete;
			protected beforeDeleteList(list: U[]): Promise<void>;
			protected beforeDeleteItem(item: U, fromList: boolean): Promise<void>;
			protected afterDeleteItem(item: U, fromList: boolean): Promise<void>;
			protected afterDeleteList(list: U[]): Promise<void>;
			get(id: number): Promise<U>;
			getById(id: number): Promise<U | undefined>;
			protected beforeGetById(id: number): Promise<void>;
			protected afterGetById(item: U): Promise<void>;
			getByIds(ids: number[]): Promise<U[]>;
			protected beforeGetByIds(ids: number[]): Promise<void>;
			protected afterGetByIds(items: U[]): Promise<void>;
			getAll(): Promise<{
				[key: number]: U;
			}>;
			protected beforeGetAll(): Promise<void>;
			protected afterGetAll(result: {
				[key: number]: U;
			}): Promise<void>;
			getList(): Promise<U[]>;
		}

		interface SocketRAMManagerRoutes {
			get: SocketRAMManagerRoute;
			getAll: SocketRAMManagerRoute;
			create: SocketRAMManagerRoute;
			created: SocketRAMManagerRoute;
			update: SocketRAMManagerRoute;
			updated: SocketRAMManagerRoute;
			delete: SocketRAMManagerRoute;
			deleted: SocketRAMManagerRoute;
		}
		interface SocketRAMManagerRoute {
			request: string;
			multiple: string;
			success: string;
			error: string;
		}
		interface SocketRAMManagerSubscribers<U, R extends U> {
			created: ((item: R) => void)[];
			updated: ((item: R) => void)[];
			deleted: ((item: R) => void)[];
		}
		interface SocketRAMManagerRouteNotPlanned<U> {
			channel: string;
			callback: (response: {
				data?: KeysObject<U>[];
			}) => void;
		}
		interface ISocketAction<U> {
			update(newData: KeysObject<U>): Promise<this>;
			onUpdate(callback: (item: this) => void): any;
			offUpdate(callback: (item: this) => void): any;
			delete(): Promise<void>;
			onDelete(callback: (item: this) => void): any;
			offDelete(callback: (item: this) => void): any;
		}
		interface ISocketData<U> extends IData, ISocketAction<U> {
		}
		abstract class SocketRAMManager<U extends IDataConstraint<U>, R extends SocketRAMManagerItem<U>> extends RAMManager<R> {
			private socketActions;
			private gotAllRecords;
			private subscribers;
			private recordsSubscribers;
			private socketRoutes;
			static defaultSocketName: string | undefined;
			protected constructor();
			getPrimaryKey(): string;
			protected getSocket(): Socket;
			protected _getSocketName(): string | undefined;
			protected abstract getObjectName(): string;
			init(): void;
			private initVariables;
			private initSocket;
			create(item: U | R, cbError?: (response: any) => void): Promise<R>;
			protected beforeCreateItem(item: R, fromList: boolean): Promise<R>;
			protected beforeCreateList(list: R[]): Promise<R[]>;
			update(item: U | R, cbError?: (response: any) => void): Promise<R>;
			protected beforeUpdateItem(item: R, fromList: boolean): Promise<R>;
			protected beforeUpdateList(list: R[]): Promise<R[]>;
			delete(item: U | R, cbError?: (response: any) => void): Promise<void>;
			protected beforeDeleteItem(item: U, fromList: boolean): Promise<void>;
			protected beforeDeleteList(list: U[]): Promise<void>;
			protected beforeGetById(id: number): Promise<void>;
			protected beforeGetByIds(ids: number[]): Promise<void>;
			protected beforeGetAll(): Promise<void>;
			protected addSocketFunction<B extends new (...args: any[]) => IDataConstraint<U>>(Base: B): {
				new(...args: any[]): {
					update(newData?: KeysObject<U>): any;
					onUpdate(callback: any): void;
					offUpdate(callback: any): void;
					delete(): Promise<void>;
					onDelete(callback: any): void;
					offDelete(callback: any): void;
				};
			} & B;
			protected abstract getObjectForRAM(objFromSocket: KeysObject<U> | U): R;
			private publish;
			private printErrors;
		}
		interface RAMExtension {
		}
		type SocketRAMManagerItem<U extends IData> = U & ISocketData<U>;
		type KeysObject<U> = {
			[Key in keyof U]?: any;
		};

		class Utils {
			static sleep(ms: number): any;
		}

		interface State {
			active?: (activeState: string) => void;
			inactive?: (oldState: string, nextState: string) => void;
			askChange?: (activeState: string, nextState: string) => boolean;
			getSlug?: () => string;
		}
		interface States {
			[key: string]: State;
		}
		class StateManager {
			logLevel: number;
			private _activeState;
			private _activeParams;
			private _activeSlug;
			private _callbackList;
			private _subscribersMutliple;
			private _subscribers;
			private _isNumberRegex;
			private _callbackFunctions;
			private constructor();
			private static __instances;
			static getInstance(name?: string): StateManager;
			subscribe(state: string | string[], callbacks: State): void;
			/**
			 *
			 * @param {string|Array} state - The state(s) to unsubscribe from
			 * @param {Object} callbacks
			 * @param {activeCallback} [callbacks.active]
			 * @param {incativeCallback} [callbacks.inactive]
			 * @param {askChangeCallback} [callbacks.askChange]
			 */
			unsubscribe(state: any, callbacks: any): void;
			/**
			 * Format a state and return if you need to bypass the test or not
			 * @param {string} string - The state to format
			 * @returns {Object} - The state, the formated state and if it's a regex state or not
			 */
			private _prepareStateString;
			/**
			 * Escape a string to be regex-compatible ()
			 * @param {string} string The string to escape
			 * @returns An escaped string
			 */
			private _escapeRegExp;
			/**
			 * Get the slug from a state string
			 * @param {string} state The state to extract the slug from
			 * @returns {string|undefined} The slug of the state or undefined if the state don't have one
			 */
			private _getSlugFromState;
			/**
			 * Save the current info (state/params) in cache
			 */
			private _saveDataInCache;
			/**
			 * Add a callback to a key
			 * @param {string} key - The key to trigger to trigger the function
			 * @param {function} callback - The function to trigger
			 */
			addFunction(key: any, callback: any): void;
			/**
			 * Remove a function from a key
			 * @param {string} key - The key to remove the function from
			 * @param {function} callback - The function to remove
			 */
			removeFunction(key: any, callback: any): void;
			/**
			 * Trigger all the functions added under a key
			 * @param {string} key - The key to trigger
			 * @param {*} [params] - The params to pass to the functions (optional)
			 */
			triggerFunction(key: any, params?: {}): void;
			/**
			 * Remove all the function added under all keys
			 */
			clearFunctions(): void;
			/**
			 * Set the current active state
			 * @param {string} state - The state to set to active
			 * @param {number} slug - The slug of the active state (Only work if the state ends with "*")
			 * @param {Object} params - The params of the active state
			 */
			setActiveState(state: any, params?: {}): void;
			/**
			 * Get the active state
			 * @returns {string} - The active state
			 */
			getActiveState(): any;
			/**
			 * Get the active params
			 * @returns {Object} - The active params
			 */
			getActiveParams(): any;
			/**
			 * Get the active slug
			 * @returns {int} - The active slug
			 */
			getActiveSlug(): any;
			/**
			 * Check if a state is in the subscribers and active, return true if it is, false otherwise
			 * @param {string} state - The state to test
			 * @returns {boolean} - True if the state is in the subscription list and active, false otherwise
			 */
			isStateActive(state: any): boolean;
			private _log;
		}

		class Socket {
			private options;
			private waitingList;
			private multipltWaitingList;
			private onDone;
			private timeoutError;
			private memoryBeforeOpen;
			private nbClose;
			private socket;
			protected constructor();
			init(options?: SocketOptions): void;
			private static __instances;
			static getInstance(name?: string): Socket;
			protected getSocketName(): string;
			addRoute(newRoute: SocketRoute): void;
			/**
			 * The route to remove
			 * @param route - The route to remove
			 */
			removeRoute(route: SocketRoute): void;
			open(done?: Function, error?: Function): void;
			/**
			 *
			 * @param channelName The channel on which the message is sent
			 * @param data The data to send
			 * @param options the options to add to the message (typically the uid)
			 */
			sendMessage<T>(channelName: string, data?: T, options?: {}): void;
			/**
			 *
			 * @param channelName The channel on which the message is sent
			 * @param data The data to send
			 * @param callbacks The callbacks to call. With the channel as key and the callback function as value
			 */
			sendMessageAndWait<T>(channelName: string, data: T, callbacks: {
				[key: string]: (data: any) => void;
			}): void;
			/**
			 *
			 * @param channelName The channel on which the message is sent
			 * @param data The data to send
			 * @param callbacks The callbacks to call. With the channel as key and the callback function as value
			 */
			sendMessageAndWaitMultiple(channelName: string, data: {}, callbacks: {}): void;
			isReady(): boolean;
			private onOpen;
			private onError;
			private onClose;
			private onMessage;
			private log;
		}

		interface ResourceLoaderOptions {
			url: string;
			type: 'js' | 'css' | 'img' | 'svg';
		}
		class ResourceLoader {
			private static headerLoaded;
			private static headerWaiting;
			static loadInHead(options: ResourceLoaderOptions | string): Promise<boolean>;
			private static loadTag;
			private static releaseAwaitFctHead;
			private static awaitFctHead;
			private static requestLoaded;
			private static requestWaiting;
			static load(options: ResourceLoaderOptions | string): Promise<string>;
			private static releaseAwaitFct;
			private static awaitFct;
			private static fetching;
			private static readFile;
			private static imgExtensions;
			private static prepareOptions;
		}

		interface ResizeObserverOptions {
			callback: CallableFunction;
			fps?: number;
		}
		class ResizeObserver {
			private callback;
			private targets;
			private fpsInterval;
			private nextFrame;
			private entriesChangedEvent;
			private willTrigger;
			private static resizeObserverClassByObject;
			private static uniqueInstance;
			private static getUniqueInstance;
			constructor(options: ResizeObserverOptions | CallableFunction);
			observe(target: Element): void;
			unobserve(target: Element): void;
			disconnect(): void;
			entryChanged(entry: any): void;
			triggerCb(): void;
			_triggerCb(): void;
		}

		interface Pointer {
			id: number;
			constructor(nativePointer: Touch | PointerEvent): any;
		}
		interface InternalCustomFunction {
			src?: PressManager;
			onDrag?: (e: PointerEvent, self: PressManager) => void;
			onDragEnd?: (e: PointerEvent, self: PressManager) => void;
		}
		interface InternalPointerEvent extends Event {
			detail: {
				state: PressManagerState;
				customFcts: InternalCustomFunction;
				realEvent: PointerEvent;
			};
		}
		interface PressManagerOptions {
			element: Element | Element[];
			onPress?: (e: PointerEvent, self: PressManager) => void;
			onPressStart?: (e: PointerEvent, self: PressManager) => void;
			onPressEnd?: (e: PointerEvent, self: PressManager) => void;
			onLongPress?: (e: PointerEvent, self: PressManager) => void;
			onDblPress?: (e: PointerEvent, self: PressManager) => void;
			onDrag?: (e: PointerEvent, self: PressManager) => void;
			onDragStart?: (e: PointerEvent, self: PressManager) => void;
			onDragEnd?: (e: PointerEvent, self: PressManager) => void;
			offsetDrag?: number;
			delayDblPress?: number;
			delayLongPress?: number;
			forceDblPress?: boolean;
		}
		interface PressManagerState {
			oneActionTriggered: boolean;
			isMoving: boolean;
		}
		class PressManager {
			private options;
			private element;
			private subPressManager;
			private delayDblPress;
			private delayLongPress;
			private nbPress;
			private offsetDrag;
			private state;
			private startPosition;
			private customFcts;
			private timeoutDblPress;
			private timeoutLongPress;
			private downEventSaved;
			private actionsName;
			private useDblPress;
			private forceDblPress;
			private functionsBinded;
			/**
			 * @param {*} options - The options
			 * @param {HTMLElement | HTMLElement[]} options.element - The element to manage
			 */
			constructor(options: PressManagerOptions);
			getElement(): Element;
			private checkDragConstraint;
			private assignValueOption;
			private bindAllFunction;
			private init;
			private downAction;
			private upAction;
			private moveAction;
			private triggerEventToParent;
			private childPress;
			private childDblPress;
			private childLongPress;
			private childDragStart;
			private emitTriggerFunction;
			destroy(): void;
		}

		interface SocketMessage {
			channel: string;
			data?: any;
		}
		interface SocketRoute {
			channel: string;
			callback: (data: any) => void;
		}
		interface SocketOptions {
			log?: boolean;
			ip?: string;
			port?: number;
			useHttps?: boolean;
			routes?: {
				[key: string]: SocketRoute[];
			};
			socketName?: string;
			onOpen?: () => void;
			onError?: () => void;
			onClose?: () => void;
		}
		interface ISocket {
			init(options: SocketOptions): any;
			addRoute(newRoute: SocketRoute): any;
			/**
			 * The route to remove
			 * @param route - The route to remove
			 */
			removeRoute(route: SocketRoute): any;
			open(done: () => void, error: () => void): any;
			/**
			 *
			 * @param channelName The channel on which the message is sent
			 * @param data The data to send
			 * @param options the options to add to the message (typically the uid)
			 */
			sendMessage<T>(channelName: string, data: T, options: any): any;
			/**
			 *
			 * @param channelName The channel on which the message is sent
			 * @param data The data to send
			 * @param callbacks The callbacks to call. With the channel as key and the callback function as value
			 */
			sendMessageAndWait<T>(channelName: string, data: T, callbacks: {
				[key: string]: (data: any) => void;
			}): any;
			/**
			 *
			 * @param channelName The channel on which the message is sent
			 * @param data The data to send
			 * @param callbacks The callbacks to call. With the channel as key and the callback function as value
			 */
			sendMessageAndWaitMultiple(channelName: string, data: {}, callbacks: {}): any;
			isReady(): boolean;
		}

		interface HttpRequestOptions {
			url: string;
			method?: HttpRequestMethod;
			data?: {
				[key: string]: any;
			} | FormData;
		}
		class DefaultHttpRequestOptions implements HttpRequestOptions {
			url: string;
			method: HttpRequestMethod;
		}
		class HttpRequest {
			private options;
			private url;
			static getMethod(method: string): HttpRequestMethod;
			private getMethod;
			constructor(options: HttpRequestOptions);
			send(): any;
			static get(url: string): Promise<any>;
			static post(url: string, data: {}): Promise<any>;
		}
		enum HttpRequestMethod {
			GET = 0,
			POST = 1,
			DELETE = 2,
			PUT = 3,
			OPTION = 4
		}

		interface DragAndDropOptions {
			applyDrag?: boolean;
			element: HTMLElement;
			elementTrigger?: HTMLElement;
			offsetDrag?: number;
			shadow?: {
				enable: boolean;
				container?: HTMLElement;
			};
			strict?: boolean;
			targets?: HTMLElement[];
			usePercent?: boolean;
			isDragEnable?: () => boolean;
			getZoom?: () => number;
			getOffsetX?: () => number;
			getOffsetY?: () => number;
			onStart?: (e: PointerEvent) => void;
			onMove?: (e: PointerEvent, position: Coordinate) => void;
			onStop?: (e: PointerEvent) => void;
			onDrop?: (element: HTMLElement, targets: HTMLElement[]) => void;
		}
		class DragAndDrop {
			static defaultOffsetDrag: number;
			private pressManager;
			private options;
			private startCursorPosition;
			private startElementPosition;
			constructor(options: DragAndDropOptions);
			private getDefaultOptions;
			private mergeProperties;
			private mergeFunctions;
			private defaultMerge;
			private init;
			private draggableElement;
			private positionShadowRelativeToElement;
			private onDragStart;
			private onDrag;
			private onDragEnd;
			private setPosition;
			private getMatchingTargets;
			setTargets(targets: HTMLElement[]): void;
		}

		interface AnimationOptions {
			animate?: Function;
			stopped?: Function;
			fps?: number;
		}
		class AnimationManager {
			static FPS_DEFAULT: number;
			private options;
			private nextFrame;
			private fpsInterval;
			private continueAnimation;
			constructor(options: AnimationOptions);
			private animate;
			/**
			 * Start the of animation
			 */
			start(): void;
			/**
			 * Stop the animation
			 */
			stop(): void;
			/**
			 * Get the FPS
			 *
			 * @returns {number}
			 */
			getFPS(): number;
			/**
			 * Set the FPS
			 *
			 * @param fps
			 */
			setFPS(fps: number): void;
			/**
			 * Get the animation status (true if animation is running)
			 *
			 * @returns {boolean}
			 */
			isStarted(): boolean;
		}

		enum WatchAction {
			SET = 0,
			CREATED = 1,
			UPDATED = 2,
			DELETED = 3
		}

		interface IData {
		}
		interface IDataConstraint<U> extends IData {
		}
		interface CSharpData extends IData {
			$type: string;
		}

		class Coordinate implements IData {
			x: number;
			y: number;
		}

		interface DtScrollablePositions {
			vertical: {
				value: number;
				max: number;
			};
			horizontal: {
				value: number;
				max: number;
			};
		}

		interface AvHideableOptions {
			canHide?: (target?: Element) => Promise<boolean>;
			beforeHide?: () => Promise<void>;
			afterHide?: () => Promise<void>;
			noHideItems?: HTMLElement[];
			container?: HTMLElement;
		}

		interface DebuggerConfig {
			writeCompiled?: boolean;
		}
		interface DefaultComponent {
			states?: States;
			[key: string]: any;
			getStateManagerName?(): string | undefined;
			getClassName(): string;
		}
		abstract class WebComponent extends HTMLElement implements DefaultComponent {
			static get observedAttributes(): {};
			private _first;
			private _isReady;
			get isReady(): boolean;
			private _translations;
			private currentState;
			private statesList;
			private _components;
			private __onChangeFct;
			private getSlugFct;
			private __watch;
			private __watchActions;
			private __prepareForCreate;
			private __prepareForUpdate;
			private __loopTemplate;
			private __watchActionsCb;
			getClassName(): string;
			getNamespace(): string;
			constructor();
			private __prepareVariables;
			private __prepareWatchesActions;
			private __initWatches;
			private __prepareForLoop;
			private __getLangTranslations;
			private __prepareTranslations;
			private __setTranslations;
			private __getStyle;
			private __getHtml;
			private __prepareTemplate;
			private __createStates;
			protected getDefaultStateCallbacks(): State;
			private __getMaxId;
			private __selectElementNeeded;
			private __mapSelectedElement;
			private __registerOnChange;
			private __endConstructor;
			private connectedCallback;
			private __defaultValue;
			private __upgradeAttributes;
			private __listBoolProps;
			private __upgradeProperty;
			private __addEvents;
			private __applyTranslations;
			private __getTranslation;
			getStateManagerName(): string | undefined;
			private __subscribeState;
			private attributeChangedCallback;
			protected postCreation(): void;
			private _unsubscribeState;
		}

		class AvScrollable extends WebComponent implements DefaultComponent {
			disable_scroll: boolean;
			zoom: number;
			floating_scroll: boolean;
			only_vertical: boolean;
			verticalScrollVisible: boolean;
			horizontalScrollVisible: boolean;
			observer: ResizeObserver;
			wheelAction: (e: WheelEvent) => void;
			touchWheelAction: (e: MouseEvent) => void;
			contentHidderWidth: number;
			contentHidderHeight: number;
			content: DtScrollablePositions;
			scrollbar: DtScrollablePositions;
			refreshTimeout: number;
			elToCalculate: HTMLDivElement;
			contentZoom: HTMLDivElement;
			contentHidder: HTMLDivElement;
			contentWrapper: HTMLDivElement;
			contentscroller: HTMLDivElement;
			verticalScrollerContainer: HTMLDivElement;
			verticalScroller: HTMLDivElement;
			horizontalScrollerContainer: HTMLDivElement;
			horizontalScroller: HTMLDivElement;
			private getVisibleBox;
			private changeZoom;
			private dimensionRefreshed;
			private calculateRealSize;
			private afterShowVerticalScroller;
			private afterShowHorizontalScroller;
			private createResizeObserver;
			private addResizeObserver;
			private removeResizeObserver;
			private addVerticalScrollAction;
			private addHorizontalScrollAction;
			private createTouchWheelAction;
			private createWheelAction;
			private addWheelAction;
			private removeWheelAction;
			scrollScrollbarTo(horizontalValue: any, verticalValue: any): void;
			scrollHorizontalScrollbar(horizontalValue: any): void;
			scrollVerticalScrollbar(verticalValue: any): void;
			scrollHorizontal(horizontalValue: any): void;
			scrollVertical(verticalValue: any): void;
			scrollToPosition(horizontalValue: any, verticalValue: any): void;
			private emitScroll;
			private preventDrag;
			protected postCreation(): void;
		}

		class AvRouterLink extends WebComponent implements DefaultComponent {
			state: string;
			protected postCreation(): void;
		}

		type AvRouteAsyncOption = {
			route: string;
			scriptUrl: string;
			render: () => new () => AvPage;
		};
		abstract class AvRouter extends WebComponent implements DefaultComponent {
			private oldPage;
			contentEl: HTMLDivElement;
			private allRoutes;
			/**
			 * Add all your routes inside this function (addRoute or addRouteAsync)
			 */
			protected abstract defineRoutes(): void;
			protected addRouteAsync<T extends AvPage>(options: AvRouteAsyncOption): void;
			protected addRoute(route: string, elementCtr: new () => AvPage): void;
			private register;
			private initRoute;
			protected postCreation(): void;
		}

		abstract class AvPage extends WebComponent implements DefaultComponent {
			show: boolean;
			abstract defineTitle(): string;
		}

		class AvHideable extends WebComponent implements DefaultComponent {
			private oldParent;
			private isVisible;
			private options;
			private checkCloseBinded;
			private pressManager;
			private content;
			private onVisibilityChangeCallbacks;
			constructor();
			private defaultBeforeHide;
			private defaultAfterHide;
			private defaultCanHide;
			configure(options: AvHideableOptions): void;
			show(): void;
			getVisibility(): boolean;
			onVisibilityChange(callback: (isVisible: boolean) => void): void;
			offVisibilityChange(callback: (isVisible: boolean) => void): void;
			private loadCSSVariables;
			hide(options?: {
				force?: boolean;
				target?: Element;
			}): any;
			private checkClose;
			protected postCreation(): void;
		}

		abstract class AvFormElement<T> extends WebComponent implements DefaultComponent {
			/**
			 * If true, the element will be required
			 */
			required: boolean;
			/**
			 * Name to use inside your form
			 */
			name: string;
			/**
			 * If true, the element can be focusable
			 */
			focusable: boolean;
			/**
			 * Value to use inside your component
			 */
			value: T;
			protected errors: string[];
			protected postCreation(): void;
			abstract getDefaultValue(): T;
			onValueChanged(): void;
			setFocus(): void;
			validate(): boolean;
			setError(message: string): void;
			clearErrors(): void;
			protected displayErrors(): void;
		}

		class AvForm extends WebComponent implements DefaultComponent {
			/**
			* Show/Hide the loading animation
			*/
			loading: boolean;
			/**
			 * Define method for your
			 */
			method: MethodType;
			action: string;
			use_event: boolean;
			private fields;
			private submits;
			submit(): any;
			/**
			 * Set the element that will perform the submit action on click.
			 */
			registerSubmit(submitElement: HTMLElement): void;
			/**
			 * Remove a registered submit element.
			 */
			unregisterSubmit(submitElement: HTMLElement): void;
			/**
			 * Add a field to the form.
			 */
			subscribe<T>(fieldHTML: AvFormElement<T>): void;
			validate(): boolean;
			setFocus(): void;
		}

		class AvFor extends WebComponent implements DefaultComponent {
			/**
			 * Name of item inside loop
			 */
			item: string;
			/**
			 * Name of property to loop though
			 */
			in: string;
			/**
			 * Name of your index
			 */
			index: string;
			private template;
			private parent;
			private parentIndex;
			private parentFor;
			private otherPart;
			private elementsByPath;
			private elementsRootByIndex;
			private forInside;
			private maxIndex;
			private watchElement;
			private watchActionArray;
			private watchObjectArray;
			private watchObjectName;
			constructor();
			private init;
			/**
			 * key must be something like that [3]
			 */
			private createForElement;
			/**
			 * key must be something like that [3] or [3].name
			 */
			private updateForElement;
			/**
			 * key must be something like that [3]
			 */
			private deleteForElement;
			private reset;
			protected postCreation(): void;
			private getParentKey;
			private updateIndexes;
			private getAllIndexes;
		}

		abstract class DisplayElement<T extends IData> extends WebComponent implements DefaultComponent {
			currentInstance: SocketRAMManagerItem<T>;
			eventsFunctions: {
				"onUpdate": (data: T) => void;
				"onDelete": (data: T) => void;
			};
			protected abstract displayInfos(newData: SocketRAMManagerItem<T>): any;
			protected onDeleteFunction(data: SocketRAMManagerItem<T>): void;
			protected onUpdateFunction(data: SocketRAMManagerItem<T>): void;
			protected destroy(): void;
			protected subscribeToInstance(): void;
			protected unsubscribeFromInstance(): void;
			/**
			 * Assign a new instance to the component
			 * @param {SocketRAMManagerItem<T>} newInstance - The new instance to display
			 */
			protected switchInstance(newInstance: SocketRAMManagerItem<T>): void;
		}

	}
	declare global {
		var namespace: string;
	}
	declare global {
		interface ObjectConstructor {
			transformIntoWatcher: (obj, onDataChanged) => any;
			prepareByPath: (obj, path, currentPath?) => { canApply: boolean, objToApply: any; };
			isPathMatching: (p1: string, p2: string) => void;
		}
	}
	declare global {
		declare namespace luxon {
			class Date extends luxon.DateTime { }
		}
	}
	declare global {
		interface Event {
			normalize: () => void;
			/**
			 * Cancel event and create a clone trigger on body : used for popup etc
			 */
			cancelEvent: () => void;
			/**
			 * Real element target on an event
			 */
			realTarget: () => Element;
		}
	}
	declare global {
		interface Element {
			findParentByTag: <T>(tagname: string | string[], untilNode?: Element) => T | null;
			findParentByType: <T>(type: new () => T) => T | null;
			findParents: <T>(tagname: string | string[], untilNode?: Element) => T[];
			findParentByClass: <T>(classname: string | string[]) => T | null;
			containsChild: (el: Element) => boolean;
			getPositionOnScreen: (untilEl?: HTMLElement) => Aventus.Coordinate;
			getElementsInSlot: <T>() => T[];
		}
	}
	declare global {
		interface Date {
			clone: () => Date;
		}
	}
	declare global {
		interface Array<T> {
			unique: () => Array<T>;
			last: () => T;
		}
	}
	interface ViewElementConfig {
		useLive?: boolean;
	}

	interface DebuggerConfig {
		writeCompiled?: boolean;
		enableWatchHistory?: boolean;
	}

	declare global {
		/**
		 * Add an attribute inside on your component
		 */
		function Attribute();
		/**
		 * Add an attribute inside on your component with changes analyze
		 */
		function Property();
		/**
		 * Add an attribute inside on your component with changes analyze
		 */
		function Property<T>(onChange: (component: T) => void);
		/**
		 * Add a property inside a watcher to be notify of changing
		 */
		function Watch();
		/**
		 * Add a property inside a watcher to be notify of changing
		 */
		function Watch<T>(onChange: (component: T, action: Aventus.WatchAction, path: string, value: any) => void);
		/**
		 * Signal that this variable is a link to your shadowroot
		 */
		function ViewElement(config?: ViewElementConfig);
		/**
		 * Clear parent view and use yours 
		 */
		function OverrideView();
		/**
		 * Add debbuger action function for your component
		 */
		function Debugger(config: DebuggerConfig);
	}
}
class AvScrollable extends WebComponent implements DefaultComponent {
	disable_scroll: boolean;
	zoom: number;
	floating_scroll: boolean;
	only_vertical: boolean;
	verticalScrollVisible: boolean;
	horizontalScrollVisible: boolean;
	observer: ResizeObserver;
	wheelAction: (e: WheelEvent) => void;
	touchWheelAction: (e: MouseEvent) => void;
	contentHidderWidth: number;
	contentHidderHeight: number;
	content: DtScrollablePositions;
	scrollbar: DtScrollablePositions;
	refreshTimeout: number;
	elToCalculate: HTMLDivElement;
	contentZoom: HTMLDivElement;
	contentHidder: HTMLDivElement;
	contentWrapper: HTMLDivElement;
	contentscroller: HTMLDivElement;
	verticalScrollerContainer: HTMLDivElement;
	verticalScroller: HTMLDivElement;
	horizontalScrollerContainer: HTMLDivElement;
	horizontalScroller: HTMLDivElement;
	private getVisibleBox;
	private changeZoom;
	private dimensionRefreshed;
	private calculateRealSize;
	private afterShowVerticalScroller;
	private afterShowHorizontalScroller;
	private createResizeObserver;
	private addResizeObserver;
	private removeResizeObserver;
	private addVerticalScrollAction;
	private addHorizontalScrollAction;
	private createTouchWheelAction;
	private createWheelAction;
	private addWheelAction;
	private removeWheelAction;
	scrollScrollbarTo(horizontalValue: any, verticalValue: any): void;
	scrollHorizontalScrollbar(horizontalValue: any): void;
	scrollVerticalScrollbar(verticalValue: any): void;
	scrollHorizontal(horizontalValue: any): void;
	scrollVertical(verticalValue: any): void;
	scrollToPosition(horizontalValue: any, verticalValue: any): void;
	private emitScroll;
	private preventDrag;
	protected postCreation(): void;
}

class AvRouterLink extends WebComponent implements DefaultComponent {
	state: string;
	protected postCreation(): void;
}

type AvRouteAsyncOption = {
	route: string;
	scriptUrl: string;
	render: () => new () => AvPage;
};
abstract class AvRouter extends WebComponent implements DefaultComponent {
	private oldPage;
	contentEl: HTMLDivElement;
	private allRoutes;
	/**
	 * Add all your routes inside this function (addRoute or addRouteAsync)
	 */
	protected abstract defineRoutes(): void;
	protected addRouteAsync<T extends AvPage>(options: AvRouteAsyncOption): void;
	protected addRoute(route: string, elementCtr: new () => AvPage): void;
	private register;
	private initRoute;
	protected postCreation(): void;
}

abstract class AvPage extends WebComponent implements DefaultComponent {
	show: boolean;
	abstract defineTitle(): string;
}

class AvHideable extends WebComponent implements DefaultComponent {
	private oldParent;
	private isVisible;
	private options;
	private checkCloseBinded;
	private pressManager;
	private content;
	private onVisibilityChangeCallbacks;
	constructor();
	private defaultBeforeHide;
	private defaultAfterHide;
	private defaultCanHide;
	configure(options: AvHideableOptions): void;
	show(): void;
	getVisibility(): boolean;
	onVisibilityChange(callback: (isVisible: boolean) => void): void;
	offVisibilityChange(callback: (isVisible: boolean) => void): void;
	private loadCSSVariables;
	hide(options?: {
		force?: boolean;
		target?: Element;
	}): any;
	private checkClose;
	protected postCreation(): void;
}

abstract class AvFormElement<T> extends WebComponent implements DefaultComponent {
	/**
	 * If true, the element will be required
	 */
	required: boolean;
	/**
	 * Name to use inside your form
	 */
	name: string;
	/**
	 * If true, the element can be focusable
	 */
	focusable: boolean;
	/**
	 * Value to use inside your component
	 */
	value: T;
	protected errors: string[];
	protected postCreation(): void;
	abstract getDefaultValue(): T;
	onValueChanged(): void;
	setFocus(): void;
	validate(): boolean;
	setError(message: string): void;
	clearErrors(): void;
	protected displayErrors(): void;
}

class AvForm extends WebComponent implements DefaultComponent {
	/**
	* Show/Hide the loading animation
	*/
	loading: boolean;
	/**
	 * Define method for your
	 */
	method: MethodType;
	action: string;
	use_event: boolean;
	private fields;
	private submits;
	submit(): any;
	/**
	 * Set the element that will perform the submit action on click.
	 */
	registerSubmit(submitElement: HTMLElement): void;
	/**
	 * Remove a registered submit element.
	 */
	unregisterSubmit(submitElement: HTMLElement): void;
	/**
	 * Add a field to the form.
	 */
	subscribe<T>(fieldHTML: AvFormElement<T>): void;
	validate(): boolean;
	setFocus(): void;
}

class AvFor extends WebComponent implements DefaultComponent {
	/**
	 * Name of item inside loop
	 */
	item: string;
	/**
	 * Name of property to loop though
	 */
	in: string;
	/**
	 * Name of your index
	 */
	index: string;
	private template;
	private parent;
	private parentIndex;
	private parentFor;
	private otherPart;
	private elementsByPath;
	private elementsRootByIndex;
	private forInside;
	private maxIndex;
	private watchElement;
	private watchActionArray;
	private watchObjectArray;
	private watchObjectName;
	constructor();
	private init;
	/**
	 * key must be something like that [3]
	 */
	private createForElement;
	/**
	 * key must be something like that [3] or [3].name
	 */
	private updateForElement;
	/**
	 * key must be something like that [3]
	 */
	private deleteForElement;
	private reset;
	protected postCreation(): void;
	private getParentKey;
	private updateIndexes;
	private getAllIndexes;
}

abstract class DisplayElement<T extends IData> extends WebComponent implements DefaultComponent {
	currentInstance: SocketRAMManagerItem<T>;
	eventsFunctions: {
		"onUpdate": (data: T) => void;
		"onDelete": (data: T) => void;
	};
	protected abstract displayInfos(newData: SocketRAMManagerItem<T>): any;
	protected onDeleteFunction(data: SocketRAMManagerItem<T>): void;
	protected onUpdateFunction(data: SocketRAMManagerItem<T>): void;
	protected destroy(): void;
	protected subscribeToInstance(): void;
	protected unsubscribeFromInstance(): void;
	/**
	 * Assign a new instance to the component
	 * @param {SocketRAMManagerItem<T>} newInstance - The new instance to display
	 */
	protected switchInstance(newInstance: SocketRAMManagerItem<T>): void;
}
