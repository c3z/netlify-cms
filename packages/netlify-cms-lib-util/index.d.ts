declare module 'netlify-cms-lib-util' {
  export const isAbsolutePath: (path: string) => boolean;
  export const basename: (path: string, extension?: string) => string;

  export const EDITORIAL_WORKFLOW_ERROR: 'EDITORIAL_WORKFLOW_ERROR';

  export const getBlobSHA: (blob: Blob) => string;

  export const getCollectionDepth: (collection: unknown) => number;
  export type AsyncLock = { release: () => Promise<void>; acquire: () => Promise<boolean> };
  export const asyncLock: () => AsyncLock;

  export const filterByPropExtension: (extension: string, propName: string) => (arr: T[]) => T[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const then: (fn: (...args: any[]) => T) => (p: Promise<T>) => T;

  export type ApiRequest =
    | {
        url: string;
        params?: Record<string, string | boolean | number>;
        method?: 'POST';
        headers?: Record<string, string>;
        body?: string;
        cache?: 'no-store';
      }
    | string;

  export const unsentRequest: {
    withDefaultHeaders: (headers: Record<string, string>) => (req: ApiRequest) => ApiRequest;
    withHeaders: (
      headers: Record<string, string>,
      req?: ApiRequest,
    ) => ((req: ApiRequest) => ApiRequest) | ApiRequest;
    withTimestamp: (req: ApiRequest) => ApiRequest;
    withRoot: (url: string) => (req: ApiRequest) => ApiRequest;
    withMethod: (method: string) => (req: ApiRequest) => ApiRequest;
    withBody: (body: FormData) => (req: ApiRequest) => ApiRequest;
    withParams: (params: unknown) => (req: ApiRequest) => ApiRequest;
    performRequest: (req: ApiRequest) => Promise<Response>;
  };

  export const parseLinkHeader: (header: string) => Record<string, string>;
  export interface CursorType {
    create: (args: unknown) => Cursor;
    updateStore: (args: unknown) => CursorType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unwrapData: () => [Map<string, any>, CursorType];
    actions: Set;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
    meta: Map;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store: Map;
  }

  export const Cursor: CursorType;

  export const CURSOR_COMPATIBILITY_SYMBOL = Symbol(
    'cursor key for compatibility with old backends',
  );

  export class APIError extends Error {
    status: number;
    constructor(message?: string, responseStatus: number | null, backend: string);
  }

  export class EditorialWorkflowError extends Error {
    constructor(message?: string, notUnderEditorialWorkflow: boolean);

    notUnderEditorialWorkflow: boolean;
  }

  export const getAllResponses: (url: string, options: RequestInit) => Promise<Response[]>;
  export const flowAsync: (funcs: Function[]) => () => Promise<unknown>;

  export const localForage: {
    setItem: <T>(key: string, item: T) => Promise<T>;
    getItem: <T>(key: string) => Promise<T | null>;
    removeItem: (key: string) => Promise<void>;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const onlySuccessfulPromises: (...args: any[]) => any;

  export const resolvePromiseProperties: <T, K>(object: T) => Promise<K>;

  export type ResponseParser = (res: Response) => Promise<string | Blob | unknown>;

  export const responseParser: ({ format }: { format: 'blob' | 'json' | 'text' }) => ResponseParser;

  export interface Map {
    get: <T>(key: string, defaultValue?: T) => T;
    getIn: <T>(key: string[], defaultValue?: T) => T;
    setIn: <T>(key: string[], value: T) => Map;
    set: <T>(key: string, value: T) => Map;
  }

  export type AssetProxy = {
    path: string;
    fileObj?: File;
    toBase64?: () => Promise<string>;
  };

  export type Entry = { path: string; slug: string; raw: string };

  export type DisplayURL = { id: string; path: string };

  export type PersistOptions = {
    newEntry?: boolean;
    parsedData?: { title: string; description: string };
    commitMessage: string;
    collectionName?: string;
    useWorkflow?: boolean;
    unpublished?: boolean;
    status?: string;
  };

  export type DeleteOptions = {};

  export interface Implementation {
    authComponent: () => void;
    restoreUser: (user: User) => Promise<User>;

    authenticate: (credentials: Credentials) => Promise<User>;
    logout: () => Promise<void> | void | null;
    getToken: () => Promise<string | null>;
    unpublishedEntry?: (collection: Collection, slug: string) => Promise<ImplementationEntry>;
    getEntry: (collection: Collection, slug: string, path: string) => Promise<ImplementationEntry>;
    allEntriesByFolder?: (
      collection: Collection,
      extension: string,
    ) => Promise<ImplementationEntry[]>;
    traverseCursor?: (
      cursor: CursorType,
      action: string,
    ) => Promise<{ entries: ImplementationEntry[]; cursor: CursorType }>;
    entriesByFolder: (collection: Collection, extension: string) => Promise<ImplementationEntry[]>;
    entriesByFiles: (collection: Collection, extension: string) => Promise<ImplementationEntry[]>;
    unpublishedEntries?: () => Promise<ImplementationEntry[]>;
    getMediaDisplayURL?: (displayURL: DisplayURL) => Promise<string>;
    getMedia: (folder?: string) => Promise<MediaFile[]>;
    getMediaFile: (path: string) => Promise<MediaFile>;
    getDeployPreview?: (
      collectionName: string,
      slug: string,
    ) => Promise<{ url: string; status: string } | null>;

    persistEntry: (obj: Entry, assetProxies: AssetProxy[], opts: PersistOptions) => Promise<void>;
    persistMedia: (file: AssetProxy, opts: PersistOptions) => Promise<MediaFile>;
    deleteFile: (path: string, commitMessage: string) => Promise<void>;
    updateUnpublishedEntryStatus?: (
      collection: string,
      slug: string,
      newStatus: string,
    ) => Promise<void>;
    publishUnpublishedEntry?: (collection: string, slug: string) => Promise<void>;
    deleteUnpublishedEntry?: (collection: string, slug: string) => Promise<void>;
  }
}