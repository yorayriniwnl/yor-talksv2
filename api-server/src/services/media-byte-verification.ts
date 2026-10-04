import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { env } from "../config/env.js";
import { type DecodedMedia, type MediaPurpose, MEDIA_MAX_BYTES, mediaLimits, mediaMimeAllowed, MediaVerificationError, MediaTooLargeError, MediaProviderUnavailableError } from "./media-provider.js";

const DEMUXERS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpeg_pipe", "image/png": "png_pipe", "image/webp": "webp_pipe",
  "video/mp4": "mov", "video/webm": "matroska", "audio/webm": "matroska",
  "audio/mpeg": "mp3", "audio/wav": "wav", "audio/ogg": "ogg",
};
let activeDecodes = 0;
export interface MediaDecoder {
  verify(buffer: Buffer, mimeType: string, purpose: MediaPurpose): Promise<DecodedMedia>;
  inspectReadiness(): Promise<boolean>;
}

/** Fixed arguments, no shell, bounded output and wall-clock time. Never surface decoder stderr. */
export async function runMediaProcess(binary: string, args: string[], timeoutMs: number, cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { shell: false, windowsHide: true, cwd, stdio: ["ignore", "pipe", "pipe"] });
    let output = "", outputBytes = 0, errorBytes = 0, failed = false;
    const abort = () => { failed = true; child.kill("SIGKILL"); };
    const timer = setTimeout(abort, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes > 256 * 1024) abort(); else output += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => { errorBytes += chunk.length; if (errorBytes > 64 * 1024) abort(); });
    child.on("error", () => { clearTimeout(timer); reject(new MediaProviderUnavailableError()); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (failed || code !== 0 || errorBytes !== 0) reject(new MediaVerificationError("Media could not be completely decoded"));
      else resolve(output);
    });
  });
}

function positive(value: unknown): number | undefined {
  const result = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  return Number.isFinite(result) && result > 0 ? result : undefined;
}

/** Magic and framing restrict the demuxer; dimensions and tracks are obtained by decoding bytes. */
export function assertMediaContainer(buffer: Buffer, mimeType: string): void {
  let matches = false;
  if (mimeType === "image/jpeg") matches = buffer.length >= 4 && buffer.readUInt16BE(0) === 0xffd8 && buffer.readUInt16BE(buffer.length - 2) === 0xffd9;
  if (mimeType === "image/png") matches = buffer.length >= 33 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    && buffer.subarray(buffer.length - 12, buffer.length - 8).equals(Buffer.alloc(4)) && buffer.toString("ascii", buffer.length - 8, buffer.length - 4) === "IEND";
  if (mimeType === "image/webp" || mimeType === "audio/wav") matches = buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF"
    && buffer.readUInt32LE(4) + 8 === buffer.length && buffer.toString("ascii", 8, 12) === (mimeType === "image/webp" ? "WEBP" : "WAVE");
  if (mimeType === "video/mp4") matches = buffer.length >= 16 && buffer.toString("ascii", 4, 8) === "ftyp"
    && ["isom","iso2","iso4","iso5","iso6","mp41","mp42","avc1","M4V ","MSNV"].includes(buffer.toString("ascii", 8, 12));
  if (mimeType === "audio/webm" || mimeType === "video/webm") matches = buffer.length >= 8 && buffer.readUInt32BE(0) === 0x1a45dfa3 && webmDocType(buffer);
  if (mimeType === "audio/ogg") matches = buffer.length >= 27 && buffer.toString("ascii", 0, 4) === "OggS" && buffer[4] === 0;
  if (mimeType === "audio/mpeg") matches = buffer.length >= 4 && (buffer.toString("ascii", 0, 3) === "ID3" || (buffer[0] === 255 && (buffer[1] & 0xe0) === 0xe0));
  if (!matches) throw new MediaVerificationError("Media bytes do not match their declared type");
}

function webmDocType(buffer: Buffer): boolean {
  // Inspect EBML DocType, rather than accepting every Matroska file under a WebM declaration.
  const vint = (offset: number, id = false): { value: number; length: number } => {
    const first = buffer[offset]; if (!first) throw new MediaVerificationError();
    let length = 1, marker = 128; while (!(first & marker) && length <= 8) { marker >>= 1; length++; }
    if (length > (id ? 4 : 8) || offset + length > buffer.length) throw new MediaVerificationError();
    let value = id ? first : first & (marker - 1);
    for (let index = 1; index < length; index++) value = value * 256 + buffer[offset + index];
    if (!Number.isSafeInteger(value)) throw new MediaVerificationError();
    return { value, length };
  };
  const header = vint(4); let offset = 4 + header.length;
  const end = offset + header.value;
  if (end > buffer.length || header.value > 4096) return false;
  while (offset < end) {
    const id = vint(offset, true); offset += id.length;
    const size = vint(offset); offset += size.length;
    if (offset + size.value > end) return false;
    if (id.value === 0x4282) return size.value === 4 && buffer.toString("ascii", offset, offset + 4) === "webm";
    offset += size.value;
  }
  return false;
}

function rejectAnimatedImage(buffer: Buffer, mimeType: string): void {
  if (mimeType === "image/png") {
    let offset = 8;
    while (offset + 12 <= buffer.length) {
      const size = buffer.readUInt32BE(offset), type = buffer.toString("ascii", offset + 4, offset + 8);
      if (type === "acTL" || type === "fcTL" || type === "fdAT") throw new MediaVerificationError("Animated images are unsupported");
      if (size > buffer.length - offset - 12) throw new MediaVerificationError();
      offset += size + 12;
    }
    if (offset !== buffer.length) throw new MediaVerificationError();
  }
  if (mimeType === "image/webp") {
    let offset = 12;
    while (offset + 8 <= buffer.length) {
      const type = buffer.toString("ascii", offset, offset + 4), size = buffer.readUInt32LE(offset + 4);
      if (type === "ANIM" || type === "ANMF" || (type === "VP8X" && size >= 1 && (buffer[offset + 8] & 2))) throw new MediaVerificationError("Animated images are unsupported");
      if (size > buffer.length - offset - 8) throw new MediaVerificationError();
      offset += 8 + size + (size % 2);
    }
    if (offset !== buffer.length) throw new MediaVerificationError();
  }
}

export class FFmpegMediaDecoder implements MediaDecoder {
  async inspectReadiness(): Promise<boolean> {
    try {
      const [probe, decoder, demuxers, codecs] = await Promise.all([
        runMediaProcess(env.MEDIA_FFPROBE_PATH, ["-version"], 5000), runMediaProcess(env.MEDIA_FFMPEG_PATH, ["-version"], 5000),
        runMediaProcess(env.MEDIA_FFPROBE_PATH, ["-v", "error", "-demuxers"], 5000),
        runMediaProcess(env.MEDIA_FFMPEG_PATH, ["-v", "error", "-decoders"], 5000),
      ]);
      const listed = (output: string, name: string) => new RegExp(`^\\s*[A-Z.]+\\s+[^\\n]*\\b${name}\\b`, "m").test(output);
      return /^ffprobe version /.test(probe) && /^ffmpeg version /.test(decoder)
        && Object.values(DEMUXERS).every((format) => listed(demuxers, format))
        && ["mjpeg", "png", "webp", "h264", "vp8", "vp9", "opus", "vorbis", "mp3", "pcm_s16le"].every((codec) => listed(codecs, codec));
    } catch { return false; }
  }

  async verify(buffer: Buffer, mimeType: string, purpose: MediaPurpose): Promise<DecodedMedia> {
    const limits = mediaLimits(purpose, mimeType);
    if (buffer.length > MEDIA_MAX_BYTES || buffer.length > limits.maxBytes) throw new MediaTooLargeError();
    if (!buffer.length || !mediaMimeAllowed(purpose, mimeType) || !DEMUXERS[mimeType]) throw new MediaVerificationError("Unsupported media type for this purpose");
    assertMediaContainer(buffer, mimeType);
    rejectAnimatedImage(buffer, mimeType);
    if (activeDecodes >= env.MEDIA_DECODE_CONCURRENCY) throw new MediaProviderUnavailableError();
    activeDecodes++;
    let directory: string;
    try { directory = await mkdtemp(join(tmpdir(), "yor-media-")); } catch (error) { activeDecodes--; throw error; }
    const input = join(directory, "asset.bin");
    try {
      await writeFile(input, buffer, { mode: 0o600, flag: "wx" });
      const inputOptions = ["-protocol_whitelist", "file,pipe", "-f", DEMUXERS[mimeType], ...(mimeType === "video/mp4" ? ["-enable_drefs", "0"] : []), "-i", input];
      const probeText = await runMediaProcess(env.MEDIA_FFPROBE_PATH, ["-v", "error", "-max_alloc", "67108864", ...inputOptions,
        "-show_streams", "-show_format", "-of", "json"], env.MEDIA_DECODE_TIMEOUT_MS, directory);
      let probe: { streams?: Record<string, unknown>[]; format?: Record<string, unknown> };
      try { probe = JSON.parse(probeText); } catch { throw new MediaVerificationError(); }
      if (!Array.isArray(probe.streams) || probe.streams.length > 3) throw new MediaVerificationError();
      const video = probe.streams.filter((stream) => stream.codec_type === "video");
      const audio = probe.streams.filter((stream) => stream.codec_type === "audio");
      if (probe.streams.some((stream) => stream.codec_type !== "video" && stream.codec_type !== "audio")) throw new MediaVerificationError("Unsupported media track");
      const family = mimeType.split("/", 1)[0];
      if ((family === "audio" && (video.length !== 0 || audio.length !== 1)) || (family !== "audio" && video.length !== 1)
        || audio.length > 1 || (family === "image" && audio.length)) throw new MediaVerificationError("Media tracks do not match their declared type");
      // Matroska supports more containers than WebM. Reject non-WebM codec combinations.
      if (mimeType.endsWith("/webm") && (video.some((stream) => !["vp8", "vp9", "av1"].includes(String(stream.codec_name)))
        || audio.some((stream) => !["opus", "vorbis"].includes(String(stream.codec_name))))) throw new MediaVerificationError("Unsupported WebM codec");
      for (const stream of audio) {
        const channels = positive(stream.channels), sampleRate = positive(stream.sample_rate);
        if (!channels || channels > 2 || !sampleRate || sampleRate > 48000) throw new MediaVerificationError("Unsupported audio encoding");
      }
      const width = video.length ? positive(video[0].width) : undefined, height = video.length ? positive(video[0].height) : undefined;
      if (video.length && (!width || !height || !Number.isInteger(width) || !Number.isInteger(height) || Math.max(width, height) > limits.maxEdge
        || Math.min(width, height) > limits.maxShortEdge || width * height > limits.maxPixels)) throw new MediaVerificationError("Media dimensions exceed the limit");
      const durations = [positive(probe.format?.duration), ...probe.streams.map((stream) => positive(stream.duration))].filter((value): value is number => value !== undefined);
      if (durations.some((duration) => duration > limits.maxDuration + 0.05) && family !== "image") throw new MediaVerificationError("Media duration exceeds the limit");
      // Full decoding rejects truncated/corrupt media and supplies duration for browser WebM lacking a Duration element.
      const progress = await runMediaProcess(env.MEDIA_FFMPEG_PATH, ["-nostdin", "-v", "error", "-xerror", "-err_detect", "crccheck+bitstream+buffer+explode", "-max_alloc", "67108864",
        "-threads", "1", "-max_pixels", String(limits.maxPixels), ...inputOptions, "-map", "0:v?", "-map", "0:a?", "-threads", "1", "-f", "null", "-progress", "pipe:1", "-"], env.MEDIA_DECODE_TIMEOUT_MS, directory);
      const decodedSeconds = Math.max(0, ...Array.from(progress.matchAll(/^out_time_us=(\d+)$/gm), (match) => Number(match[1]) / 1_000_000));
      const decodedFrames = Math.max(0, ...Array.from(progress.matchAll(/^frame=(\d+)$/gm), (match) => Number(match[1])));
      if (!progress.includes("progress=end") || (video.length && !decodedFrames)) throw new MediaVerificationError("Media decode is incomplete");
      if (family === "image" && decodedFrames !== 1) throw new MediaVerificationError("Animated images are unsupported");
      const duration = family === "image" ? undefined : Math.max(decodedSeconds, ...durations);
      if (family !== "image" && (!duration || !Number.isFinite(duration) || duration > limits.maxDuration + 0.05)) throw new MediaVerificationError("Media duration is invalid");
      return { buffer, mimeType, bytes: buffer.length, sha256: createHash("sha256").update(buffer).digest("hex"), width, height, duration };
    } finally { activeDecodes--; await rm(directory, { recursive: true, force: true }); }
  }
}
