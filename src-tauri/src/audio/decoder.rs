use std::fs::File;
use symphonia::core::codecs::audio::*;
use symphonia::core::formats::probe::Hint;
use symphonia::core::formats::*;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::units::{Time, Timestamp};

pub(crate) struct SymphoniaDecoder {
    format: Box<dyn FormatReader>,
    decoder: Box<dyn AudioDecoder>,
    track_id: u32,
    sample_rate: u32,
    channels: u16,
    duration_ms: u64,
}

impl SymphoniaDecoder {
    pub(crate) fn new(path: &str) -> Result<(Self, Vec<f32>), String> {
        let file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
        let mss = MediaSourceStream::new(Box::new(file), Default::default());

        let mut hint = Hint::new();
        if let Some(ext) = path.rsplit('.').next() {
            hint.with_extension(ext);
        }

        let format = symphonia::default::get_probe()
            .probe(
                &hint,
                mss,
                FormatOptions::default(),
                MetadataOptions::default(),
            )
            .map_err(|e| format!("Failed to probe file: {}", e))?;

        let track = format
            .default_track(TrackType::Audio)
            .ok_or("No audio track found")?;
        let track_id = track.id;

        let codec_params = track.codec_params.clone().ok_or("No codec parameters")?;
        let dec_opts: AudioDecoderOptions = Default::default();
        let audio_params = codec_params.audio().ok_or("No audio parameters")?;
        let decoder = symphonia::default::get_codecs()
            .make_audio_decoder(audio_params, &dec_opts)
            .map_err(|e| format!("Failed to create decoder: {}", e))?;
        let sample_rate = audio_params.sample_rate.unwrap_or(44100);
        let channels = audio_params
            .channels
            .as_ref()
            .map(|c| c.count() as u16)
            .unwrap_or(2);
        let duration_ms = format
            .media_info()
            .time_base
            .zip(format.media_info().duration)
            .and_then(|(tb, d)| tb.calc_time(Timestamp::from(d.get() as u32)))
            .map(|t| t.as_millis() as u64)
            .unwrap_or(0);

        let buf = vec![0.0f32; (sample_rate * channels as u32) as usize];

        Ok((
            Self {
                format,
                decoder,
                track_id,
                sample_rate,
                channels,
                duration_ms,
            },
            buf,
        ))
    }

    pub(crate) fn decode(&mut self, output: &mut [f32]) -> Result<usize, ()> {
        loop {
            let packet = match self.format.next_packet() {
                Ok(Some(pkt)) => pkt,
                Ok(None) => return Ok(0),
                Err(_) => return Err(()),
            };

            if packet.track_id != self.track_id {
                continue;
            }

            match self.decoder.decode(&packet) {
                Ok(decoded) => {
                    let total = decoded.samples_interleaved();
                    let to_copy = total.min(output.len());
                    decoded.copy_to_slice_interleaved(&mut output[..to_copy]);
                    return Ok(to_copy);
                }
                Err(_) => continue,
            }
        }
    }

    pub(crate) fn seek_to(&mut self, pos_ms: u64) -> Result<(), ()> {
        let track = self.format.default_track(TrackType::Audio).ok_or(())?;
        let codec_params = track.codec_params.clone().ok_or(())?;
        let audio_params = codec_params.audio().ok_or(())?;
        let dec_opts: AudioDecoderOptions = Default::default();
        self.decoder = symphonia::default::get_codecs()
            .make_audio_decoder(audio_params, &dec_opts)
            .map_err(|_| ())?;

        self.format
            .seek(
                SeekMode::Coarse,
                SeekTo::Time {
                    time: Time::from_millis_u64(pos_ms),
                    track_id: Some(self.track_id),
                },
            )
            .map(|_| ())
            .map_err(|_| ())
    }

    pub(crate) fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
    pub(crate) fn channels(&self) -> u16 {
        self.channels
    }
    pub(crate) fn duration_ms(&self) -> u64 {
        self.duration_ms
    }
}
