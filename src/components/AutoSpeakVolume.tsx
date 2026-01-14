import { invoke } from "@tauri-apps/api/core";
import { EVENT_NAMES, useInvoke } from "@/lib/events";
import { AutoSpeakState } from "@/lib/types";
import { IIVolumeLow, IIVolumeHigh, IIVolumeOff } from "@/components/icons";

const AutoSpeakVolume = ({ className }: { className?: string }) => {
	const autoSpeak = useInvoke<AutoSpeakState>(EVENT_NAMES.get_auto_speak_state, AutoSpeakState.Off);
	return (
		<div
			role="none"
			onClick={async () => {
				autoSpeak.setState(
					await invoke<AutoSpeakState>(EVENT_NAMES.toggle_auto_speak),
				);
			}}
		>
			{
				{
					[AutoSpeakState.Off]: <IIVolumeOff className={className} />,
					[AutoSpeakState.Single]: <IIVolumeLow className={className} />,
					[AutoSpeakState.All]: <IIVolumeHigh className={className} />,
				}[autoSpeak.state]
			}
		</div>
	);
};

export default AutoSpeakVolume;
