// Face reading on this device, for the arrival / leaving photos of workers.
// The face library and its models (~12 MB, served from /models/face) load only when a photo is taken.

type FaceApi = typeof import('@vladmandic/face-api');

const MODEL_URL = `${import.meta.env.BASE_URL}models/face`;

let loading: Promise<FaceApi> | null = null;

/** Load the face library and models once; start early to hide the wait */
export const loadFaceModels = (): Promise<FaceApi> => {
  loading ??= (async () => {
    const faceapi = await import('@vladmandic/face-api');
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    return faceapi;
  })().catch((error) => {
    // Let the next photo try again (e.g. after the connection comes back)
    loading = null;
    throw error;
  });
  return loading;
};

export type FaceRead =
  | { ok: true; descriptor: number[]; box: { x: number; y: number; width: number; height: number } }
  | { ok: false; reason: string };

/**
 * The face in a photo, as the 128 numbers the server compares. One clear face is needed: people
 * far behind the worker are ignored, but two faces of similar size are refused.
 */
export async function readFace(image: HTMLCanvasElement): Promise<FaceRead> {
  const faceapi = await loadFaceModels();
  const faces = await faceapi
    .detectAllFaces(image, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (faces.length === 0) {
    return { ok: false, reason: 'No face found. Ask the worker to look at the camera, in good light, without a helmet visor or mask.' };
  }
  const bySize = [...faces].sort((a, b) => b.detection.box.area - a.detection.box.area);
  const [main, next] = bySize;
  if (next && next.detection.box.area > main.detection.box.area * 0.5) {
    return { ok: false, reason: 'More than one person is in the photo. Take it with only the worker in front of the camera.' };
  }
  // A face that fills too little of the photo gives an unreliable match
  if (main.detection.box.width < image.width * 0.12) {
    return { ok: false, reason: 'The face is too small. Move closer so the face fills more of the photo.' };
  }
  const { x, y, width, height } = main.detection.box;
  return { ok: true, descriptor: Array.from(main.descriptor), box: { x, y, width, height } };
}
