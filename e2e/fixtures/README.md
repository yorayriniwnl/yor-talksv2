`delivery.webm` is a two-second, silent, solid-blue synthetic video (120×90, 10 FPS). It has a finite duration and seek metadata so the delivery-expiry test checks real browser decoding and restored seek position. It contains no camera recording or provider data.

Generated locally with FFmpeg 9.0.2:

```sh
ffmpeg -v error -nostdin -f lavfi -i 'color=c=0x2980b9:s=120x90:r=10:d=2' -an -c:v libvpx-vp9 -b:v 20k -threads 1 delivery.webm
```

Browser tests read the checked-in bytes; they do not require FFmpeg at runtime.

`delivery.wav` is a two-second synthetic 440 Hz tone (8 kHz mono, signed 16-bit PCM), generated offline with the same verified FFmpeg binary. It tests native audio decoding/seek restoration after message delivery expiry, without a microphone or provider:

```sh
ffmpeg -v error -nostdin -f lavfi -i 'sine=frequency=440:sample_rate=8000:duration=2' -c:a pcm_s16le -threads 1 delivery.wav
```
