import { RoomConnectOptions, RoomOptions, VideoPresets } from "livekit-client";

export const roomOpts: RoomOptions = {
    adaptiveStream: true,
    dynacast: true,
    publishDefaults: {
      simulcast: false,
    //   videoSimulcastLayers: [VideoPresets.h90, VideoPresets.h216],
      videoCodec: 'vp8',
    },
    videoCaptureDefaults: {
      resolution: VideoPresets.h720.resolution,
    },
  };
