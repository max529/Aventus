
declare namespace Media {
	class ZoneMedia extends Zone.ZoneUnit<CoordinateByPlanMedia> implements Zone.IZone, IMediaVisualElement<ZoneMedia>, Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		iconTop: number;
		iconLeft: number;
		speakers: Speaker[];
		logic: IMediaLogic;
	}

	class VideoSource implements Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		/**
		 * [Primary, AutoIncrement]
		 */
		id: number;
		physicalLocation: IPhysicalVideo;
		/**
		 * [NotInDB]
		 */
		get isConnected(): boolean;
		/**
		 * [NotInDB]
		 */
		get ipAddress(): string;
		/**
		 * [NotInDB]
		 */
		get macAddress(): string;
		createdDate: Date;
		updatedDate: Date;
	}

	class VideoFormat implements Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		framePerSecond: number;
		width: number;
		height: number;
		ratio: ASPECT_RATIO;
	}

	class TVButton extends Zone.VisualElement<CoordinateByPlanTv> implements IMediaVisualElement<TVButton>, Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		hubTV: Network.HubTV;
		/**
		 * [NotInDB]
		 */
		logic: IMediaLogic;
		videoRoot: IPhysicalVideo;
	}

	class SpotifyToken implements Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		/**
		 * [Primary, AutoIncrement]
		 */
		id: number;
		name: string;
		uidUser: string;
		/**
		 * [Size]
		 */
		accessToken: string;
		/**
		 * [Size]
		 */
		refreshToken: string;
		tokenType: string;
		expiresIn: number;
		people: Person.PersonUnit[];
		createdDate: Date;
		updatedDate: Date;
	}

	class SpotifyPlaylist implements Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		id: number;
		name: string;
		uri: string;
		uid: string;
		queues: AudioMetadata[];
	}

	enum SPEAKER_STATUS {
		NO_SPEAKER_DETECTED = 0,
		OK = 1
	}

	class Speaker extends Zone.VisualElement<CoordinateBySpeaker> implements Zone.IVisualElement, Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		name: string;
		model: string;
		stereo: Network.SPEAKER_TYPE;
		status: SPEAKER_STATUS;
		profilePath: string;
		/**
		 * [NotInDB]
		 */
		idLine: number;
		/**
		 * [NotInDB, SyncWith]
		 */
		volume: number;
		/**
		 * [NotInDB, SyncWith]
		 */
		isMuted: boolean;
	}

	class ScenarioMediaValue implements Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		/**
		 * [Primary, AutoIncrement]
		 */
		id: number;
		/**
		 * [NotInDB]
		 */
		idZone: number;
		/**
		 * [NotInDB]
		 */
		idSource: number;
		/**
		 * [NotInDB]
		 */
		scenarioTriggerId: number;
		zoneProperty: MediaControllableProperty;
		createdDate: Date;
		updatedDate: Date;
	}

	class ScenarioMediaTrigger implements Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		/**
		 * [Primary, AutoIncrement]
		 */
		id: number;
		priority: Project.ControllablePriority;
		startupValue: number;
		activePeriodInSecond: number;
		/**
		 * [NotInDB]
		 */
		values: ScenarioMediaValue[];
		createdDate: Date;
		updatedDate: Date;
	}

	class ScenarioMediaTarget implements Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		/**
		 * [Primary, AutoIncrement]
		 */
		id: number;
		zone: IMediaVisualElement;
		source: ISourceUnit;
		createdDate: Date;
		updatedDate: Date;
	}

	class ScenarioMediaPeriod implements Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		/**
		 * [Primary, AutoIncrement]
		 */
		id: number;
		/**
		 * [NotInDB]
		 */
		triggers: ScenarioMediaTrigger[];
		startMinute: number;
		endMinute: number;
		createdDate: Date;
		updatedDate: Date;
	}

	class ScenarioMedia extends Person.Configurable<ConfigScenarioMedia> implements Person.IConfigurable<ConfigScenarioMedia>, Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		/**
		 * [Primary, AutoIncrement]
		 */
		id: number;
		name: string;
		/**
		 * [Size]
		 */
		description: string;
		/**
		 * [NotInDB]
		 */
		isActive: boolean;
		ownerId: number;
		isPublic: boolean;
		/**
		 * [NotInDB]
		 */
		plansId: number[];
		/**
		 * [NotInDB]
		 */
		targets: ScenarioMediaTarget[];
		/**
		 * [NotInDB]
		 */
		currentPriority: Project.ControllablePriority;
		/**
		 * [NotInDB]
		 */
		periods: ScenarioMediaPeriod[];
	}

	enum REMOTE_CONTROL_KEY {
		NONE = 0,
		POWER_ON = 1,
		POWER_OFF = 2,
		POWER_TOGGLE = 3,
		CHANNEL_UP = 4,
		CHANNEL_DOWN = 5,
		VOLUME_UP = 6,
		VOLUME_DOWN = 7,
		MUTE = 8,
		ENTER = 9,
		UP = 10,
		DOWN = 11,
		LEFT = 12,
		RIGHT = 13,
		RETURN = 14,
		EXIT = 15,
		MENU = 16,
		FORWARD = 17,
		NEXT = 18,
		BACKWARD = 19,
		PREV = 20,
		PLAY = 21,
		PAUSE = 22,
		TOGGLE_PLAY_PAUSE = 23,
		STOP = 24,
		REC = 25,
		HOME = 26,
		INPUT = 27,
		NUMBER = 28,
		TV = 29,
		TXT = 30,
		STTL = 31,
		AUDIO = 32,
		INFO = 33,
		EPG = 34,
		RED = 35,
		GREEN = 36,
		YELLOW = 37,
		BLUE = 38
	}

	class RadioFavourite implements Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		/**
		 * [Primary, AutoIncrement]
		 */
		id: number;
		name: string;
		favourites: AudioMetadata[];
		createdDate: Date;
		updatedDate: Date;
	}

	enum PORT_VIDEO_TYPE {
		HDMI = 0,
		DISPLAY_PORT = 1,
		CINCH = 2,
		VGA = 3
	}

	enum PORT_AUDIO_TYPE {
		OPTICAL = 0,
		HDMI_ARC = 1
	}

	class PortVideo implements Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		/**
		 * [Primary, AutoIncrement]
		 */
		id: number;
		index: number;
		connectedDevice: IPhysicalVideo;
		/**
		 * [NotInDB]
		 */
		parentId: number;
		hasARC: boolean;
		portVideoType: PORT_VIDEO_TYPE;
		title: string;
		uri: string;
		icon: string;
		createdDate: Date;
		updatedDate: Date;
	}

	class PortAudio implements Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		/**
		 * [Primary, AutoIncrement]
		 */
		id: number;
		name: string;
		networkDante: Network.INetworkDante;
		type: PORT_AUDIO_TYPE;
		index: number;
		/**
		 * [NotInDB]
		 */
		get ipAddress(): string;
		/**
		 * [NotInDB]
		 */
		get isConnected(): boolean;
		createdDate: Date;
		updatedDate: Date;
	}

	enum MEDIA_METADATA_TYPE {
		track = 0,
		album = 1,
		artist = 2,
		playlist = 3,
		url = 4,
		video = 5
	}

	class MediaLogic implements IMediaLogic, Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		id: number;
		idOldSource: number;
		currentValue: MediaControllablePropertyLive;
		allPropertiesByPriority: MediaControllablePropertyLive[];
	}

	class MediaControllablePropertyLive implements Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		property: MediaControllableProperty;
		activePeriodInSecond: number;
		/**
		 * [NotInDB]
		 */
		priority: Project.ControllablePriority;
		/**
		 * [NotInDB]
		 */
		startingDate: Date;
	}

	class MediaControllableProperty implements Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		/**
		 * [Primary, AutoIncrement]
		 */
		id: number;
		idSource: number;
		volume: number;
		createdDate: Date;
		updatedDate: Date;
	}

	interface ISourceUnit extends Person.IConfigurable<ConfigSource>, Aventus.IData {
		/**
		 * [Primary, AutoIncrement]
		 */
		id: number;
		name: string;
		isPublic: boolean;
		audioSource: AudioSource;
		/**
		 * [NotInDB]
		 */
		isPlaying: boolean;
		/**
		 * [NotInDB]
		 */
		isConnected: boolean;
		/**
		 * [NotInDB]
		 */
		playedOnZones: number[];
		/**
		 * [NotInDB]
		 */
		playedOnTvs: number[];
		/**
		 * [NotInDB]
		 */
		currentPriority: Project.ControllablePriority;
	}

	interface IRemoteController extends Aventus.IData {
	}

	interface IPhysicalVideo extends IRemoteController, Aventus.IData {
		/**
		 * [Primary, AutoIncrement]
		 */
		id: number;
		name: string;
		parentPortId: number;
		networkClient: Network.INetworkClient;
		/**
		 * [NotInDB]
		 */
		isConnected: boolean;
		/**
		 * [NotInDB]
		 */
		ipAddress: string;
		/**
		 * [NotInDB]
		 */
		macAddress: string;
		/**
		 * [NotInDB]
		 */
		isDisplayable: boolean;
		isAudiable: boolean;
		/**
		 * [NotInDB]
		 */
		portsVideo: PortVideo[];
		/**
		 * [NotInDB]
		 */
		portsAudio: PortAudio[];
		/**
		 * [NotInDB]
		 */
		sources: ISourceUnit[];
	}

	interface IMediaVisualElement<T extends Zone.IVisualElement = never> extends Aventus.IData {
		/**
		 * [NotInDB]
		 */
		logic: IMediaLogic;
	}

	interface IMediaMetadata extends Aventus.IData {
		/**
		 * [Primary, AutoIncrement]
		 */
		id: number;
		uid: string;
		uri: string;
		/**
		 * [JsonConverterAttribute]
		 */
		type: MEDIA_METADATA_TYPE;
		/**
		 * [NotInDB]
		 */
		isPlaying: boolean;
	}

	interface IMediaLogic extends Aventus.IData {
		id: number;
		idOldSource: number;
		currentValue: MediaControllablePropertyLive;
		allPropertiesByPriority: MediaControllablePropertyLive[];
	}

	interface IApiVideo extends Aventus.IData {
	}

	interface IApiAudio extends Aventus.IData {
	}

	class CoordinateBySpeaker extends Zone.CoordinateByPlan implements Zone.ICoordinateByPlan, Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
	}

	class CoordinateByPlanTv extends Zone.CoordinateByPlan implements Zone.ICoordinateByPlan, Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
	}

	class CoordinateByPlanMedia extends Zone.CoordinateByPlan implements Zone.ICoordinateByPlan, Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
	}

	class CoordinateByAmplifier extends Zone.CoordinateByPlan implements Zone.ICoordinateByPlan, Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
	}

	class ConfigSource extends Person.Configuration<ISourceUnit> implements Person.IConfiguration, Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		isVisible: boolean;
		position: number;
	}

	class ConfigScenarioMedia extends Person.Configuration<ScenarioMedia> implements Person.IConfiguration, Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		isVisible: boolean;
		position: number;
	}

	class AudioSource implements Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		/**
		 * [Primary, AutoIncrement]
		 */
		id: number;
		physicalLocation: Network.INetworkDante;
		index: number;
		/**
		 * [NotInDB]
		 */
		metadata: AudioMetadata;
		/**
		 * [NotInDB]
		 */
		format: AudioFormat;
		/**
		 * [NotInDB]
		 */
		get isConnected(): boolean;
		/**
		 * [NotInDB]
		 */
		get ipAddress(): string;
		/**
		 * [NotInDB]
		 */
		get macAddress(): string;
		createdDate: Date;
		updatedDate: Date;
	}

	class AudioMetadata implements IMediaMetadata, Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		/**
		 * [Primary, AutoIncrement]
		 */
		id: number;
		uid: string;
		/**
		 * [NotInDB]
		 */
		isPlaying: boolean;
		titleTrack: string;
		/**
		 * [Size]
		 */
		artist: string;
		album: string;
		durationMs: number;
		albumArt: string;
		albumArtBackgroundColor: string;
		progressMs: number;
		uri: string;
		/**
		 * [NotInDB]
		 */
		genre: string;
		contextUri: string;
		/**
		 * [JsonConverterAttribute]
		 */
		type: MEDIA_METADATA_TYPE;
		/**
		 * [NotInDB]
		 */
		timestampProgress: Date;
		createdDate: Date;
		updatedDate: Date;
	}

	class AudioFormat implements Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		sampleRate: number;
		bits: number;
		channels: number;
	}

	enum ASPECT_RATIO {
		RATIO_16_9 = 0,
		RATIO_4_3 = 1,
		RATIO_16_10 = 2,
		RATIO_21_9 = 3
	}

	abstract class PhysicalVideo<T extends IPhysicalVideo = never> implements IPhysicalVideo, Aventus.IData {
		abstract get $type(): string;
		/**
		 * [Primary, AutoIncrement]
		 */
		id: number;
		name: string;
		/**
		 * [NotInDB]
		 */
		parentPortId: number;
		hubTV: Network.HubTV;
		abstract get isDisplayable(): boolean;
		abstract get isAudiable(): boolean;
		networkClient: Network.INetworkClient;
		/**
		 * [NotInDB]
		 */
		get isConnected(): boolean;
		/**
		 * [NotInDB]
		 */
		get ipAddress(): string;
		/**
		 * [NotInDB]
		 */
		get macAddress(): string;
		/**
		 * [NotInDB]
		 */
		portsVideo: PortVideo[];
		/**
		 * [NotInDB]
		 */
		portsAudio: PortAudio[];
		/**
		 * [NotInDB]
		 */
		sources: ISourceUnit[];
		createdDate: Date;
		updatedDate: Date;
	}

	class SonyTV extends PhysicalVideo<SonyTV> implements IPhysicalVideo, Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		preSharedKey: string;
		modelName: string;
		get isDisplayable(): boolean;
		get isAudiable(): boolean;
	}

	class DummyTV extends PhysicalVideo<DummyTV> implements IPhysicalVideo, Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		get isDisplayable(): boolean;
		get isAudiable(): boolean;
	}

	class DummyAVR extends PhysicalVideo<DummyAVR> implements IPhysicalVideo, Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		get isDisplayable(): boolean;
		get isAudiable(): boolean;
	}

	enum AMPLIFIER_STATUS {
		NO_AMPLIFIER_DETECTED = 0,
		OK = 1
	}

	abstract class SourceUnit<T extends ISourceUnit = never> extends Person.Configurable<ConfigSource> implements ISourceUnit, Aventus.IData {
		abstract get $type(): string;
		/**
		 * [Primary, AutoIncrement]
		 */
		id: number;
		name: string;
		isPublic: boolean;
		videoSource: VideoSource;
		audioSource: AudioSource;
		/**
		 * [NotInDB]
		 */
		abstract get isConnected(): boolean;
		/**
		 * [NotInDB]
		 */
		playedOnZones: number[];
		/**
		 * [NotInDB]
		 */
		playedOnTvs: number[];
		/**
		 * [NotInDB]
		 */
		isPlaying: boolean;
		/**
		 * [NotInDB]
		 */
		currentPriority: Project.ControllablePriority;
	}

	class SpotifySource extends SourceUnit<SpotifySource> implements ISourceUnit, Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		token: SpotifyToken;
		uid: string;
		uidUser: string;
		deviceId: string;
		playlist: SpotifyPlaylist;
		get isConnected(): boolean;
	}

	class RadioSource extends SourceUnit<RadioSource> implements ISourceUnit, Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		favourite: RadioFavourite;
		get isConnected(): boolean;
	}

	class PortSource extends SourceUnit<PortSource> implements ISourceUnit, Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		port: PortVideo;
		get isConnected(): boolean;
	}

	class ApplicationSource extends SourceUnit<ApplicationSource> implements ISourceUnit, Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		get isConnected(): boolean;
		title: string;
		uri: string;
		icon: string;
	}

	class AirplaySource extends SourceUnit<AirplaySource> implements ISourceUnit, Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		get isConnected(): boolean;
	}

	class AppleTV extends PhysicalVideo<AppleTV> implements IPhysicalVideo, Aventus.IData, Aventus.CSharpData {
		static CSharpType: string;
		get $type(): string;
		/**
		 * [NotInDB, SyncWith]
		 */
		isPaired: boolean;
		get isDisplayable(): boolean;
		get isAudiable(): boolean;
	}

}
