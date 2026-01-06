import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { EVENT_NAMES } from "@/lib/events";
import { AutoSpeakState } from "@/lib/types";
import { IIVolumeLow, IIVolumeHigh, IIVolumeOff } from "@/components/icons";

const AutoSpeakVolume = ({className}:{className?:string}) => {
	const [autoSpeak, setAutoSpeak] = useState<AutoSpeakState>(
		AutoSpeakState.Off,
	);
	useEffect(() => {
		invoke<AutoSpeakState>(EVENT_NAMES.GET_AUTO_SPEAK_STATE).then((res) =>
			setAutoSpeak(res),
		);
	}, []);
	return (
		<div
			role="none"
			onClick={async () => {
				console.log("fasfsadf");
				setAutoSpeak(
					await invoke<AutoSpeakState>(EVENT_NAMES.TOGGLE_AUTO_SPEAK),
				);
			}}
		>
			{
				{
					[AutoSpeakState.Off]: <IIVolumeOff className={className}/>,
					[AutoSpeakState.Single]: <IIVolumeLow className={className}/>,
					[AutoSpeakState.All]: <IIVolumeHigh className={className}/>,
				}[autoSpeak]
			}
		</div>
	);
};

export default AutoSpeakVolume;
