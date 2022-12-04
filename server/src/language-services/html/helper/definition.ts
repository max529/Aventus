import { CustomTypeAttribute } from "../../ts/component/compiler/def"

export declare interface HTMLDoc {
	[key: string]: {
		class: string,
		name: string,
		description: string,
		attributes: {
			[key: string]: {
				name: string,
				description: string,
				type: CustomTypeAttribute,
				values: {
					name: string,
					description: string,
				}[]
			}
		}
	}
}