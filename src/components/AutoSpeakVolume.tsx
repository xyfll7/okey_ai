import { invoke } from "@tauri-apps/api/core";
import { EVENT_NAMES, useInvoke } from "@/lib/events";
import { AutoSpeakState } from "@/lib/types";
import { Icons } from "@/components/icons";

const AutoSpeakVolume = ({ className }: { className?: string }) => {
	const { ...autoSpeak_X } = useInvoke<AutoSpeakState>(EVENT_NAMES.get_auto_speak_state, AutoSpeakState.Off);
	return (
		<div
			role="none"
			onClick={async () => {
				autoSpeak_X.setState(
					await invoke<AutoSpeakState>(EVENT_NAMES.toggle_auto_speak),
				);
			}}
		>
			{
				{
					[AutoSpeakState.Off]: <Icons.volumeOff className={className} />,
					[AutoSpeakState.Single]: <Icons.volumeLow className={className} />,
					[AutoSpeakState.All]: <Icons.volumeHigh className={className} />,
				}[autoSpeak_X.state]
			}
		</div>
	);
};

export default AutoSpeakVolume;
