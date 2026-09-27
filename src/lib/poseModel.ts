import type { PoseLandmarker as PoseLandmarkerType } from "@mediapipe/tasks-vision";

const XNNPACK_INFO = "INFO: Created TensorFlow Lite XNNPACK delegate for CPU.";

export async function createPoseModel(): Promise<PoseLandmarkerType> {
  const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks("/wasm");

  // MediaPipe's WASM stderr also carries this harmless startup notice.
  // Route only that notice away from console.error so Next's dev overlay
  // does not present it as an application failure.
  const runtime = self as typeof self & { Module?: { printErr?: (message: string) => void } };
  const previousPrinter = runtime.Module?.printErr;
  runtime.Module = {
    ...runtime.Module,
    printErr: (message: string) => {
      if (message.trim() === XNNPACK_INFO) {
        console.info(message);
      } else if (previousPrinter) {
        previousPrinter(message);
      } else {
        console.error(message);
      }
    },
  };

  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: "/models/pose_landmarker_lite.task", delegate: "CPU" },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.4,
    minPosePresenceConfidence: 0.4,
    minTrackingConfidence: 0.4,
  });
}
