export interface AddonManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  logo?: string;
  background?: string;
  resources: Array<string | { name: string; types: string[]; idPrefixes?: string[] }>;
  types: string[];
  catalogs: AddonCatalog[];
  idPrefixes?: string[];
  behaviorHints?: {
    adult?: boolean;
    p2p?: boolean;
    configurable?: boolean;
    configurationRequired?: boolean;
  };
}

export interface AddonCatalog {
  type: string;
  id: string;
  name?: string;
  extra?: {
    name: string;
    isRequired?: boolean;
    options?: string[];
    optionsLimit?: number;
  }[];
}

export interface MetaPreview {
  id: string;
  type: string;
  name: string;
  poster?: string;
  background?: string;
  logo?: string;
  description?: string;
  releaseInfo?: string;
  imdbRating?: string;
  genres?: string[];
  links?: { name: string; category: string; url: string }[];
}

export interface MetaDetail extends MetaPreview {
  videos?: Video[];
  runtime?: string;
  language?: string;
  country?: string;
  awards?: string;
  website?: string;
}

export interface Video {
  id: string;
  title: string;
  released?: string;
  thumbnail?: string;
  streams?: Stream[];
  available?: boolean;
  episode?: number;
  season?: number;
  trailers?: Stream[];
  overview?: string;
}

export interface Stream {
  title?: string;
  name?: string;
  description?: string;
  url?: string;
  infoHash?: string;
  fileIdx?: number;
  subtitles?: { id: string; url: string; lang: string }[];
  behaviorHints?: {
    notWebReady?: boolean;
    bingeGroup?: string;
    proxyHeaders?: Record<string, string>;
  };
}

export interface CatalogResponse {
  metas: MetaPreview[];
}

export interface MetaResponse {
  meta: MetaDetail;
}

export interface StreamsResponse {
  streams: Stream[];
}
