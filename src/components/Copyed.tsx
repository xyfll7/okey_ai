import { useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle01Icon, Copy01Icon,Tick02Icon } from "@hugeicons/core-free-icons";

const Copyed = ({ text, className }: { text?: string; className?: string }) => {
	const [copied, setCopied] = useState(false);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleCopy = async (e: React.MouseEvent) => {
		e.stopPropagation(); // 阻止事件冒泡到 Button
		e.preventDefault();  // 添加这个
		
		if (text) {
			try {
				await navigator.clipboard.writeText(text);
				setCopied(true);

				// 清除之前的定时器
				if (timeoutRef.current) {
					clearTimeout(timeoutRef.current);
				}

				timeoutRef.current = setTimeout(() => {
					setCopied(false);
				}, 2000);
			} catch (err) {
				console.error("Failed to copy text: ", err);
			}
		}
	};

	const handleMouseEnter = (e: React.MouseEvent) => {
		e.stopPropagation();
		// hover时立即恢复为Copy状态
		// if (copied) {
		// 	if (timeoutRef.current) {
		// 		clearTimeout(timeoutRef.current);
		// 	}
		// 	setCopied(false);
		// }
	};

	return (
		<div 
			role="none"
			onClick={handleCopy} 
			onMouseEnter={handleMouseEnter}
			className="inline-block"
			style={{ pointerEvents: 'auto' }} // 关键：强制启用指针事件
		>
			{copied ? <HugeiconsIcon icon={Tick02Icon} className={className} strokeWidth={2}/> : <HugeiconsIcon icon={Copy01Icon} className={className} strokeWidth={2}/>}
		</div>
	);
};

export default Copyed;
