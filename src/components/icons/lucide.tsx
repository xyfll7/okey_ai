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
} from 'lucide-react';

const strokeWidth = 2

export const IIGripVertical = (props: any) => <GripVertical {...props} strokeWidth={strokeWidth}/>;
export const IIArrowExpand = (props: any) => <Maximize2 {...props} strokeWidth={strokeWidth}/>;
export const IIArrowUp = (props: any) => <ChevronUp {...props} strokeWidth={strokeWidth}/>;
export const IIPin = (props: any) => <Pin {...props} strokeWidth={strokeWidth}/>;
export const IIAdd = (props: any) => <Plus {...props} strokeWidth={strokeWidth}/>;
export const IICancel = (props: any) => <X {...props} strokeWidth={strokeWidth}/>;
export const IITick = (props: any) => <Check {...props} strokeWidth={strokeWidth}/>;
export const IICopy = (props: any) => <Copy {...props} strokeWidth={strokeWidth}/>;
export const IIVolumeLow = (props: any) => <VolumeX {...props} strokeWidth={strokeWidth}/>;
export const IIVolumeOff = (props: any) => <Volume1 {...props} strokeWidth={strokeWidth}/>;
export const IIVolumeHigh = (props: any) => <Volume2 {...props} strokeWidth={strokeWidth}/>;
export const IIList = (props: any) => <ListMinus {...props} strokeWidth={strokeWidth}/>;