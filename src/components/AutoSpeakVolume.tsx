import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { EVENT_NAMES } from "@/lib/events";
import { AutoSpeakState } from "@/lib/types";
import { HugeiconsIcon } from "@hugeicons/react";
import { VolumeLowIcon, VolumeHighIcon, VolumeOffIcon } from "@hugeicons/core-free-icons";

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
					[AutoSpeakState.Off]: <HugeiconsIcon icon={VolumeOffIcon} className={className} strokeWidth={2}/>,
					[AutoSpeakState.Single]: <HugeiconsIcon icon={VolumeLowIcon} className={className} strokeWidth={2}/>,
					[AutoSpeakState.All]: <HugeiconsIcon icon={VolumeHighIcon} className={className} strokeWidth={2}/>,
				}[autoSpeak]
			}
		</div>
	);
};

export default AutoSpeakVolume;
