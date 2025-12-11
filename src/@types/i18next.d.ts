import "react-i18next";
import type { Resources } from "../i18n/index";

declare module "i18next" {
	interface CustomTypeOptions {
		// enableSelector: "optimize";
		resources: Resources["en"];
	}
}
