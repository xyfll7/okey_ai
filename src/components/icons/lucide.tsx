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
} from 'lucide-react';

const strokeWidth = 2

export const IconGripVertical = (props: any) => <GripVertical {...props} strokeWidth={strokeWidth}/>;
export const IconArrowExpand = (props: any) => <Maximize2 {...props} strokeWidth={strokeWidth}/>;
export const IconArrowUp = (props: any) => <ChevronUp {...props} strokeWidth={strokeWidth}/>;
export const IconPin = (props: any) => <Pin {...props} strokeWidth={strokeWidth}/>;
export const IconAdd = (props: any) => <Plus {...props} strokeWidth={strokeWidth}/>;
export const IconCancel = (props: any) => <X {...props} strokeWidth={strokeWidth}/>;
export const IconTick = (props: any) => <Check {...props} strokeWidth={strokeWidth}/>;
export const IconCopy = (props: any) => <Copy {...props} strokeWidth={strokeWidth}/>;
export const IconVolumeLow = (props: any) => <VolumeX {...props} strokeWidth={strokeWidth}/>;
export const IconVolumeOff = (props: any) => <Volume1 {...props} strokeWidth={strokeWidth}/>;
export const IconVolumeHigh = (props: any) => <Volume2 {...props} strokeWidth={strokeWidth}/>;