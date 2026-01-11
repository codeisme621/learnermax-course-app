/**
 * MediaConvert Job Configuration for HLS Encoding
 *
 * Creates job settings for encoding MP4 videos to HLS format with
 * Automated Adaptive Bitrate (ABR) for optimal quality renditions.
 *
 * Based on AWS MediaConvert best practices:
 * https://docs.aws.amazon.com/mediaconvert/latest/ug/example-job-settings.html
 *
 * Key architecture:
 * - Automated ABR analyzes source and creates optimal rendition ladder
 * - Separate outputs for video and audio (required for ABR)
 * - QVBR (Quality-based Variable Bitrate) for best quality/size ratio
 * - MULTI_PASS_HQ for highest quality encoding
 */

import type { CreateJobCommandInput } from '@aws-sdk/client-mediaconvert';

export interface JobConfig {
  inputBucket: string;
  inputKey: string;
  outputBucket: string;
  outputPrefix: string;
  roleArn: string;
}

/**
 * Create MediaConvert job settings for HLS encoding with Automated ABR.
 *
 * Output structure:
 * s3://{outputBucket}/{outputPrefix}/
 *   ├── main.m3u8           (master playlist)
 *   ├── video_*.m3u8        (video variant playlists at different bitrates)
 *   ├── video_*.ts          (video segments)
 *   ├── audio.m3u8          (audio playlist)
 *   └── audio_*.ts          (audio segments)
 *
 * MediaConvert Automated ABR will automatically create multiple video
 * renditions (e.g., 360p, 480p, 720p, 1080p) based on source quality.
 */
export function createJobSettings(config: JobConfig): CreateJobCommandInput {
  const { inputBucket, inputKey, outputBucket, outputPrefix, roleArn } = config;

  return {
    Role: roleArn,
    Settings: {
      TimecodeConfig: {
        Source: 'ZEROBASED',
      },
      Inputs: [
        {
          FileInput: `s3://${inputBucket}/${inputKey}`,
          AudioSelectors: {
            'Audio Selector 1': {
              Offset: 0,
              DefaultSelection: 'DEFAULT',
              ProgramSelection: 1,
            },
          },
          VideoSelector: {
            ColorSpace: 'FOLLOW',
            Rotate: 'DEGREE_0',
            AlphaBehavior: 'DISCARD',
          },
          FilterEnable: 'AUTO',
          PsiControl: 'USE_PSI',
          FilterStrength: 0,
          DeblockFilter: 'DISABLED',
          DenoiseFilter: 'DISABLED',
          InputScanType: 'AUTO',
          TimecodeSource: 'ZEROBASED',
        },
      ],
      OutputGroups: [
        {
          Name: 'Apple HLS',
          OutputGroupSettings: {
            Type: 'HLS_GROUP_SETTINGS',
            HlsGroupSettings: {
              ManifestDurationFormat: 'FLOATING_POINT',
              SegmentLength: 6, // 6-second segments (industry standard)
              TimedMetadataId3Period: 10,
              CaptionLanguageSetting: 'OMIT',
              Destination: `s3://${outputBucket}/${outputPrefix}/`,
              TimedMetadataId3Frame: 'PRIV',
              CodecSpecification: 'RFC_4281',
              OutputSelection: 'MANIFESTS_AND_SEGMENTS',
              ProgramDateTimePeriod: 600,
              MinSegmentLength: 0,
              MinFinalSegmentLength: 0,
              DirectoryStructure: 'SINGLE_DIRECTORY', // Simpler structure, all files in one dir
              ProgramDateTime: 'EXCLUDE',
              SegmentControl: 'SEGMENTED_FILES',
              ManifestCompression: 'NONE',
              ClientCache: 'ENABLED',
              AudioOnlyHeader: 'INCLUDE',
              StreamInfResolution: 'INCLUDE',
            },
          },
          // Automated ABR - MediaConvert auto-generates optimal rendition ladder
          AutomatedEncodingSettings: {
            AbrSettings: {
              MaxRenditions: 4, // Up to 4 quality levels (360p, 480p, 720p, 1080p)
              MaxAbrBitrate: 8000000, // 8 Mbps max (high quality 1080p)
              MinAbrBitrate: 600000, // 600 Kbps min (low bandwidth 360p)
            },
          },
          // Two outputs: video template + audio (required for ABR)
          Outputs: [
            // Video output - template for Automated ABR to create renditions
            {
              ContainerSettings: {
                Container: 'M3U8',
                M3u8Settings: {
                  AudioFramesPerPes: 4,
                  PcrControl: 'PCR_EVERY_PES_PACKET',
                  PmtPid: 480,
                  PrivateMetadataPid: 503,
                  ProgramNumber: 1,
                  PatInterval: 0,
                  PmtInterval: 0,
                  Scte35Source: 'NONE',
                  VideoPid: 481,
                  AudioPids: [482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492],
                },
              },
              VideoDescription: {
                ScalingBehavior: 'DEFAULT',
                TimecodeInsertion: 'DISABLED',
                AntiAlias: 'ENABLED',
                Sharpness: 50,
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    InterlaceMode: 'PROGRESSIVE',
                    NumberReferenceFrames: 3,
                    Syntax: 'DEFAULT',
                    Softness: 0,
                    GopClosedCadence: 1,
                    GopSize: 60,
                    Slices: 2,
                    GopBReference: 'DISABLED',
                    EntropyEncoding: 'CABAC',
                    FramerateControl: 'INITIALIZE_FROM_SOURCE',
                    RateControlMode: 'QVBR', // Quality-based Variable Bitrate (best quality/size)
                    CodecProfile: 'MAIN',
                    Telecine: 'NONE',
                    MinIInterval: 0,
                    AdaptiveQuantization: 'AUTO',
                    CodecLevel: 'AUTO',
                    FieldEncoding: 'PAFF',
                    SceneChangeDetect: 'ENABLED',
                    QualityTuningLevel: 'MULTI_PASS_HQ', // Highest quality encoding
                    FramerateConversionAlgorithm: 'DUPLICATE_DROP',
                    UnregisteredSeiTimecode: 'DISABLED',
                    GopSizeUnits: 'FRAMES',
                    ParControl: 'INITIALIZE_FROM_SOURCE',
                    NumberBFramesBetweenReferenceFrames: 2,
                    RepeatPps: 'DISABLED',
                    DynamicSubGop: 'STATIC',
                  },
                },
                AfdSignaling: 'NONE',
                DropFrameTimecode: 'ENABLED',
                RespondToAfd: 'NONE',
                ColorMetadata: 'INSERT',
              },
              OutputSettings: {
                HlsSettings: {
                  AudioGroupId: 'program_audio',
                  AudioRenditionSets: 'program_audio',
                  AudioOnlyContainer: 'AUTOMATIC',
                  IFrameOnlyManifest: 'EXCLUDE',
                },
              },
              NameModifier: '_video',
            },
            // Audio output - separate audio stream for ABR
            {
              ContainerSettings: {
                Container: 'M3U8',
                M3u8Settings: {
                  AudioFramesPerPes: 4,
                  PcrControl: 'PCR_EVERY_PES_PACKET',
                  PmtPid: 480,
                  PrivateMetadataPid: 503,
                  ProgramNumber: 1,
                  PatInterval: 0,
                  PmtInterval: 0,
                  Scte35Source: 'NONE',
                  TimedMetadataPid: 502,
                  VideoPid: 481,
                  AudioPids: [482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492],
                },
              },
              AudioDescriptions: [
                {
                  AudioTypeControl: 'FOLLOW_INPUT',
                  AudioSourceName: 'Audio Selector 1',
                  CodecSettings: {
                    Codec: 'AAC',
                    AacSettings: {
                      AudioDescriptionBroadcasterMix: 'NORMAL',
                      Bitrate: 128000, // 128 kbps AAC (good quality)
                      RateControlMode: 'CBR',
                      CodecProfile: 'LC',
                      CodingMode: 'CODING_MODE_2_0', // Stereo
                      RawFormat: 'NONE',
                      SampleRate: 48000,
                      Specification: 'MPEG4',
                    },
                  },
                  LanguageCodeControl: 'FOLLOW_INPUT',
                },
              ],
              OutputSettings: {
                HlsSettings: {
                  AudioGroupId: 'program_audio',
                  AudioTrackType: 'ALTERNATE_AUDIO_AUTO_SELECT_DEFAULT',
                  AudioOnlyContainer: 'AUTOMATIC',
                  IFrameOnlyManifest: 'EXCLUDE',
                },
              },
              NameModifier: '_audio',
            },
          ],
        },
      ],
    },
    // Hardware acceleration when available (faster encoding)
    AccelerationSettings: {
      Mode: 'PREFERRED',
    },
    StatusUpdateInterval: 'SECONDS_60',
    Priority: 0,
    // Metadata for tracking in EventBridge handler
    UserMetadata: {
      inputKey,
      outputPrefix,
    },
  };
}

/**
 * Parse the S3 key from an upload path to extract courseId and lessonId.
 *
 * Expected input format: uploads/raw/{courseId}/{lessonId}.mp4
 * Example: uploads/raw/spec-driven-dev/lesson-1.mp4
 *
 * @returns { courseId, lessonId } or null if parsing fails
 */
export function parseUploadKey(key: string): { courseId: string; lessonId: string } | null {
  // Match: uploads/raw/{courseId}/{lessonId}.{extension}
  const match = key.match(/^uploads\/raw\/([^/]+)\/([^/]+)\.[^.]+$/);

  if (!match) {
    return null;
  }

  return {
    courseId: match[1],
    lessonId: match[2],
  };
}

/**
 * Generate the output prefix for HLS files.
 *
 * Output format: courses/{courseId}/{lessonId}
 * Example: courses/spec-driven-dev/lesson-1
 */
export function generateOutputPrefix(courseId: string, lessonId: string): string {
  return `courses/${courseId}/${lessonId}`;
}

/**
 * Generate the HLS manifest key for DynamoDB storage.
 *
 * MediaConvert names the master playlist after the input file basename.
 * For input "uploads/raw/{courseId}/{lessonId}.mp4", the manifest is "{lessonId}.m3u8"
 *
 * Format: courses/{courseId}/{lessonId}/{lessonId}.m3u8
 */
export function generateHlsManifestKey(courseId: string, lessonId: string): string {
  return `courses/${courseId}/${lessonId}/${lessonId}.m3u8`;
}
