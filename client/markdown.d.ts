// A guide's Markdown, imported as text by the tests (angular.json: loader); the app loads it over HTTP.
declare module '*.md' {
  const text: string;
  export default text;
}

// The standard advice and materials (data/*.ndjson), imported as text (angular.json: loader).
declare module '*.ndjson' {
  const text: string;
  export default text;
}
