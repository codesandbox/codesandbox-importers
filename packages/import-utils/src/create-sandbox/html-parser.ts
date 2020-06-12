function isValidResource(resource: string) {
  return (
    resource.startsWith("https://") ||
    resource.startsWith("http://") ||
    resource.startsWith("//")
  );
}

/**
 * Checks line for css resource, returns if exist
 *
 * @param {string} line  line to check
 * @returns {(string | undefined)}
 */
function getCssResource(line: string): string | undefined {
  const cssRegex = /<link[^]*href="(.*\.css)"/;
  const match = line.match(cssRegex);
  if (match && match[1]) {
    const resource = match[1];
    if (!isValidResource(resource)) {
      return;
    }

    return resource;
  }
}

/**
 * Checks line for js resource, returns if resource exist
 *
 * @param {string} line  line to check
 * @returns {(string | undefined)}
 */
function getJsResource(line: string): string | undefined {
  const jsRegex = /<script[^]*src="(.*)"/;
  const match = line.match(jsRegex);
  if (match && match[1]) {
    const resource = match[1];
    if (!isValidResource(resource)) {
      return;
    }

    return resource;
  }
}

/**
 * Returns an array of strings to external resources, we deliberately don't check
 * for javascript, since this is often added to the body. The body will be copied over
 *
 * @param {string} html
 */
function getExternalResources(html: string) {
  return html
    .split("\n")
    .map((line) => getCssResource(line) || getJsResource(line))
    .filter((x) => x);
}

/**
 * Get all information in the body
 *
 * @param {string} html
 */
function getBodyContent(html: string): string | undefined {
  const bodyRegex = /<body>([^]*)<\/body>/;

  const match = html.match(bodyRegex);

  if (match) {
    return match[1];
  }
}

/**
 * Parses the html for external resources and body
 *
 * @export
 * @param {string} html
 */
export default function parseHTML(html: string) {
  const externalResources = getExternalResources(html);
  const bodyContent = getBodyContent(html);

  return {
    body: bodyContent || '<div id="root"></div>',
    externalResources,
  };
}
