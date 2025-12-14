import { cn } from "@/lib/utils";

const AudioRecording = ({
  color = "bg-red-700",
}: {
  /**
   * Tailwind CSS background color class (e.g. `bg-red-500`, `bg-blue-600`)
   * @type {string}
   */
  color?: string;
}) => {
  return (
    <div className="flex items-center justify-center w-full h-full">
      {/* 波形容器 */}
      <div className="flex items-center h-full w-full gap-[10%]">
        {[...Array(3)].map((_, i) => (
          <span
            key={i}
            className={cn("  h-[60%] flex-1 rounded-full", color)}
            style={{
              transformOrigin: "center",
              animation: "ios-wave 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes ios-wave {
          0% {
            transform: scaleY(0.3);
            opacity: 0.5;
          }
          50% {
            transform: scaleY(1);
            opacity: 1;
          }
          100% {
            transform: scaleY(0.4);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

export default AudioRecording;
