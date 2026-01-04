import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { EVENT_NAMES } from "@/lib/events";
import { AutoSpeakState } from "@/lib/types";
import { VolumeLow, VolumeHigh, VolumeOff } from "@/components/icons/hugeicons";

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
					[AutoSpeakState.Off]: <VolumeOff className={className} strokeWidth={2}/>,
					[AutoSpeakState.Single]: <VolumeLow className={className} strokeWidth={2}/>,
					[AutoSpeakState.All]: <VolumeHigh className={className} strokeWidth={2}/>,
				}[autoSpeak]
			}
		</div>
	);
};

export default AutoSpeakVolume;
