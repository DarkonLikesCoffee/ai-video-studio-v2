export type NasaSvsSelectedAsset = {
  id: string;
  title: string;
  creator: string;
  attribution?: string;
  sourcePage: string;
  url: string;
  mime: "video/mp4" | "video/webm";
  width?: number;
  height?: number;
  license: "Public domain";
  shotIds: string[];
};
export function isSafeNasaSvsUrl(value: string): boolean;
export function getNasaRetryDelayMs(retryAfter: string | null | undefined, attempt: number, now?: number): number;
export function fetchNasaVideoWithRetries(
  url: string | URL,
  fetchImpl?: typeof fetch,
  pause?: (milliseconds: number) => Promise<void>,
): Promise<Response>;
export function validateNasaSelection(selection: { assets: Array<NasaSvsSelectedAsset | NasaLibrarySelectedAsset> }): Array<NasaSvsSelectedAsset | NasaLibrarySelectedAsset>;
export function runCli(argv?: string[]): Promise<void>;

export type NasaLibrarySelectedAsset = {
  id: string;
  nasaId: string;
  title: string;
  creator: string;
  attribution?: string;
  sourcePage: string;
  license: "Public domain";
  shotIds: string[];
  trimBeforeSecondsByShotId?: Record<string, number>;
};
export function isSafeNasaLibraryVideoUrl(value: string): boolean;
export function resolveNasaLibraryVideoUrl(
  nasaId: string,
  fetchImpl?: typeof fetch,
): Promise<string>;
export function normalizeNasaLibraryVideoUrl(value: string): string | null;
export function resolveNasaLibraryVideoUrls(nasaId: string, fetchImpl?: typeof fetch): Promise<string[]>;
