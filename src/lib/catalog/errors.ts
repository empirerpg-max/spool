export class CatalogUnavailableError extends Error {
  readonly name = 'CatalogUnavailableError';
  constructor(readonly source: 'tmdb' | 'books', message = `${source} indisponível`) {
    super(message);
  }
}

export class WorkNotFoundError extends Error {
  readonly name = 'WorkNotFoundError';
}
