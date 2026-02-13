import * as jspb from 'google-protobuf'



export class AnalysisRequest extends jspb.Message {
  getVideoUrl(): string;
  setVideoUrl(value: string): AnalysisRequest;

  getOptions(): AnalysisOptions | undefined;
  setOptions(value?: AnalysisOptions): AnalysisRequest;
  hasOptions(): boolean;
  clearOptions(): AnalysisRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AnalysisRequest.AsObject;
  static toObject(includeInstance: boolean, msg: AnalysisRequest): AnalysisRequest.AsObject;
  static serializeBinaryToWriter(message: AnalysisRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AnalysisRequest;
  static deserializeBinaryFromReader(message: AnalysisRequest, reader: jspb.BinaryReader): AnalysisRequest;
}

export namespace AnalysisRequest {
  export type AsObject = {
    videoUrl: string,
    options?: AnalysisOptions.AsObject,
  }
}

export class AnalysisOptions extends jspb.Message {
  getSensitivity(): number;
  setSensitivity(value: number): AnalysisOptions;

  getAnalyzeComments(): boolean;
  setAnalyzeComments(value: boolean): AnalysisOptions;

  getTopCommentsCount(): number;
  setTopCommentsCount(value: number): AnalysisOptions;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AnalysisOptions.AsObject;
  static toObject(includeInstance: boolean, msg: AnalysisOptions): AnalysisOptions.AsObject;
  static serializeBinaryToWriter(message: AnalysisOptions, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AnalysisOptions;
  static deserializeBinaryFromReader(message: AnalysisOptions, reader: jspb.BinaryReader): AnalysisOptions;
}

export namespace AnalysisOptions {
  export type AsObject = {
    sensitivity: number,
    analyzeComments: boolean,
    topCommentsCount: number,
  }
}

export class AnalysisResponse extends jspb.Message {
  getJobId(): string;
  setJobId(value: string): AnalysisResponse;

  getStatus(): string;
  setStatus(value: string): AnalysisResponse;

  getMessage(): string;
  setMessage(value: string): AnalysisResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AnalysisResponse.AsObject;
  static toObject(includeInstance: boolean, msg: AnalysisResponse): AnalysisResponse.AsObject;
  static serializeBinaryToWriter(message: AnalysisResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AnalysisResponse;
  static deserializeBinaryFromReader(message: AnalysisResponse, reader: jspb.BinaryReader): AnalysisResponse;
}

export namespace AnalysisResponse {
  export type AsObject = {
    jobId: string,
    status: string,
    message: string,
  }
}

export class ProgressRequest extends jspb.Message {
  getJobId(): string;
  setJobId(value: string): ProgressRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ProgressRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ProgressRequest): ProgressRequest.AsObject;
  static serializeBinaryToWriter(message: ProgressRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ProgressRequest;
  static deserializeBinaryFromReader(message: ProgressRequest, reader: jspb.BinaryReader): ProgressRequest;
}

export namespace ProgressRequest {
  export type AsObject = {
    jobId: string,
  }
}

export class ProgressEvent extends jspb.Message {
  getJobId(): string;
  setJobId(value: string): ProgressEvent;

  getType(): string;
  setType(value: string): ProgressEvent;

  getMessage(): string;
  setMessage(value: string): ProgressEvent;

  getProgress(): number;
  setProgress(value: number): ProgressEvent;

  getTimestamp(): string;
  setTimestamp(value: string): ProgressEvent;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ProgressEvent.AsObject;
  static toObject(includeInstance: boolean, msg: ProgressEvent): ProgressEvent.AsObject;
  static serializeBinaryToWriter(message: ProgressEvent, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ProgressEvent;
  static deserializeBinaryFromReader(message: ProgressEvent, reader: jspb.BinaryReader): ProgressEvent;
}

export namespace ProgressEvent {
  export type AsObject = {
    jobId: string,
    type: string,
    message: string,
    progress: number,
    timestamp: string,
  }
}

export class ResultRequest extends jspb.Message {
  getJobId(): string;
  setJobId(value: string): ResultRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ResultRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ResultRequest): ResultRequest.AsObject;
  static serializeBinaryToWriter(message: ResultRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ResultRequest;
  static deserializeBinaryFromReader(message: ResultRequest, reader: jspb.BinaryReader): ResultRequest;
}

export namespace ResultRequest {
  export type AsObject = {
    jobId: string,
  }
}

export class AnalysisResult extends jspb.Message {
  getJobId(): string;
  setJobId(value: string): AnalysisResult;

  getVideoId(): string;
  setVideoId(value: string): AnalysisResult;

  getMetadata(): VideoMetadata | undefined;
  setMetadata(value?: VideoMetadata): AnalysisResult;
  hasMetadata(): boolean;
  clearMetadata(): AnalysisResult;

  getSafetyScore(): number;
  setSafetyScore(value: number): AnalysisResult;

  getCategoriesList(): Array<string>;
  setCategoriesList(value: Array<string>): AnalysisResult;
  clearCategoriesList(): AnalysisResult;
  addCategories(value: string, index?: number): AnalysisResult;

  getGeminiResponse(): string;
  setGeminiResponse(value: string): AnalysisResult;

  getTopCommentsList(): Array<Comment>;
  setTopCommentsList(value: Array<Comment>): AnalysisResult;
  clearTopCommentsList(): AnalysisResult;
  addTopComments(value?: Comment, index?: number): Comment;

  getStatus(): string;
  setStatus(value: string): AnalysisResult;

  getCreatedAt(): string;
  setCreatedAt(value: string): AnalysisResult;

  getCompletedAt(): string;
  setCompletedAt(value: string): AnalysisResult;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AnalysisResult.AsObject;
  static toObject(includeInstance: boolean, msg: AnalysisResult): AnalysisResult.AsObject;
  static serializeBinaryToWriter(message: AnalysisResult, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AnalysisResult;
  static deserializeBinaryFromReader(message: AnalysisResult, reader: jspb.BinaryReader): AnalysisResult;
}

export namespace AnalysisResult {
  export type AsObject = {
    jobId: string,
    videoId: string,
    metadata?: VideoMetadata.AsObject,
    safetyScore: number,
    categoriesList: Array<string>,
    geminiResponse: string,
    topCommentsList: Array<Comment.AsObject>,
    status: string,
    createdAt: string,
    completedAt: string,
  }
}

export class VideoMetadata extends jspb.Message {
  getTitle(): string;
  setTitle(value: string): VideoMetadata;

  getDescription(): string;
  setDescription(value: string): VideoMetadata;

  getChannel(): string;
  setChannel(value: string): VideoMetadata;

  getDuration(): number;
  setDuration(value: number): VideoMetadata;

  getViewCount(): number;
  setViewCount(value: number): VideoMetadata;

  getPublishedAt(): string;
  setPublishedAt(value: string): VideoMetadata;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): VideoMetadata.AsObject;
  static toObject(includeInstance: boolean, msg: VideoMetadata): VideoMetadata.AsObject;
  static serializeBinaryToWriter(message: VideoMetadata, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): VideoMetadata;
  static deserializeBinaryFromReader(message: VideoMetadata, reader: jspb.BinaryReader): VideoMetadata;
}

export namespace VideoMetadata {
  export type AsObject = {
    title: string,
    description: string,
    channel: string,
    duration: number,
    viewCount: number,
    publishedAt: string,
  }
}

export class Comment extends jspb.Message {
  getAuthor(): string;
  setAuthor(value: string): Comment;

  getText(): string;
  setText(value: string): Comment;

  getLikes(): number;
  setLikes(value: number): Comment;

  getRank(): number;
  setRank(value: number): Comment;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Comment.AsObject;
  static toObject(includeInstance: boolean, msg: Comment): Comment.AsObject;
  static serializeBinaryToWriter(message: Comment, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Comment;
  static deserializeBinaryFromReader(message: Comment, reader: jspb.BinaryReader): Comment;
}

export namespace Comment {
  export type AsObject = {
    author: string,
    text: string,
    likes: number,
    rank: number,
  }
}

export class CancelRequest extends jspb.Message {
  getJobId(): string;
  setJobId(value: string): CancelRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CancelRequest.AsObject;
  static toObject(includeInstance: boolean, msg: CancelRequest): CancelRequest.AsObject;
  static serializeBinaryToWriter(message: CancelRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CancelRequest;
  static deserializeBinaryFromReader(message: CancelRequest, reader: jspb.BinaryReader): CancelRequest;
}

export namespace CancelRequest {
  export type AsObject = {
    jobId: string,
  }
}

export class CancelResponse extends jspb.Message {
  getJobId(): string;
  setJobId(value: string): CancelResponse;

  getCancelled(): boolean;
  setCancelled(value: boolean): CancelResponse;

  getMessage(): string;
  setMessage(value: string): CancelResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CancelResponse.AsObject;
  static toObject(includeInstance: boolean, msg: CancelResponse): CancelResponse.AsObject;
  static serializeBinaryToWriter(message: CancelResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CancelResponse;
  static deserializeBinaryFromReader(message: CancelResponse, reader: jspb.BinaryReader): CancelResponse;
}

export namespace CancelResponse {
  export type AsObject = {
    jobId: string,
    cancelled: boolean,
    message: string,
  }
}

