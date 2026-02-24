import {
  GripVertical,
  Maximize2,
  ChevronUp,
  Pin,
  Plus,
  X,
  Check,
  Copy,
  VolumeX,
  Volume1,
  Volume2,
  ListMinus,
  Settings,
  Languages
} from 'lucide-react';

const strokeWidth = 2

export const IIGripVertical = (props: React.ComponentProps<"svg">) => <GripVertical {...props} strokeWidth={strokeWidth} />;
export const IIArrowExpand = (props: React.ComponentProps<"svg">) => <Maximize2 {...props} strokeWidth={strokeWidth} />;
export const IIArrowUp = (props: React.ComponentProps<"svg">) => <ChevronUp {...props} strokeWidth={strokeWidth} />;
export const IIPin = (props: React.ComponentProps<"svg">) => <Pin {...props} strokeWidth={strokeWidth} />;
export const IIAdd = (props: React.ComponentProps<"svg">) => <Plus {...props} strokeWidth={strokeWidth} />;
export const IIX = (props: React.ComponentProps<"svg">) => <X {...props} strokeWidth={strokeWidth} />;
export const IITick = (props: React.ComponentProps<"svg">) => <Check {...props} strokeWidth={strokeWidth} />;
export const IICopy = (props: React.ComponentProps<"svg">) => <Copy {...props} strokeWidth={strokeWidth} />;
export const IIVolumeLow = (props: React.ComponentProps<"svg">) => <VolumeX {...props} strokeWidth={strokeWidth} />;
export const IIVolumeOff = (props: React.ComponentProps<"svg">) => <Volume1 {...props} strokeWidth={strokeWidth} />;
export const IIVolumeHigh = (props: React.ComponentProps<"svg">) => <Volume2 {...props} strokeWidth={strokeWidth} />;
export const IIList = (props: React.ComponentProps<"svg">) => <ListMinus {...props} strokeWidth={strokeWidth} />;
export const IISettings = (props: React.ComponentProps<"svg">) => <Settings {...props} strokeWidth={strokeWidth} />;
export const IILanguages = (props: React.ComponentProps<"svg">) => <Languages {...props} strokeWidth={strokeWidth} />;