import "react-i18next";
import type { Resources } from "./index";

declare module "react-i18next" {
  interface CustomTypeOptions {
    resources: Resources["en"];
  }
}