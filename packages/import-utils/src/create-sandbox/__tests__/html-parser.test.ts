import parser from "../html-parser";

describe("html-parser", () => {
  it("can retrieve body from html", () => {
    const BODY_HTML = `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Redux Shopping Cart Example</title>
        </head>
        <body>
          <div id="root"></div>
          <!--
            This HTML file is a template.
            If you open it directly in the browser, you will see an empty page.
            You can add webfonts, meta tags, or analytics to this file.
            The build step will place the bundled scripts into the <body> tag.
            To begin the development, run \`npm start\` in this folder.
            To create a production bundle, use \`npm run build\`.
          -->
        </body>
      </html>
    `;
    expect(parser(BODY_HTML)).toMatchSnapshot();
  });

  it("can retrieve js external resources", () => {
    const BODY_HTML = `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Redux Shopping Cart Example</title>
          <link href="https://redux-form.com/6.8.0/bundle.css"
            media="screen, projection"
            rel="stylesheet" type="text/css"/>
          <link href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/4.3.0/css/font-awesome.min.css"
            media="screen, projection" rel="stylesheet" type="text/css"/>
        </head>
        <body>
          <div id="root"></div>
          <!--
            This HTML file is a template.
            If you open it directly in the browser, you will see an empty page.
            You can add webfonts, meta tags, or analytics to this file.
            The build step will place the bundled scripts into the <body> tag.
            To begin the development, run \`npm start\` in this folder.
            To create a production bundle, use \`npm run build\`.
          -->
          <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.slim.min.js"></script>
        </body>
      </html>
    `;

    expect(parser(BODY_HTML)).toMatchSnapshot();
  });

  it("can retrieve css external resources", () => {
    const BODY_HTML = `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Redux Shopping Cart Example</title>
          <link href="https://redux-form.com/6.8.0/bundle.css"
            media="screen, projection"
            rel="stylesheet" type="text/css"/>
          <link href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/4.3.0/css/font-awesome.min.css"
            media="screen, projection" rel="stylesheet" type="text/css"/>
        </head>
        <body>
          <div id="root"></div>
          <!--
            This HTML file is a template.
            If you open it directly in the browser, you will see an empty page.
            You can add webfonts, meta tags, or analytics to this file.
            The build step will place the bundled scripts into the <body> tag.
            To begin the development, run \`npm start\` in this folder.
            To create a production bundle, use \`npm run build\`.
          -->
        </body>
      </html>
    `;

    expect(parser(BODY_HTML)).toMatchSnapshot();
  });
});
