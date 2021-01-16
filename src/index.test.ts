import { isLeft } from "fp-ts/lib/Either";
import * as TE from "fp-ts/TaskEither";
import { parseDOM } from "htmlparser2";
import * as du from "domutils";

import {
  run,
  connect,
  $,
  $$,
  join,
  parent,
  siblings,
  nextSibling,
  text,
  html,
  attributes,
  attr,
  fork,
  each,
} from "./index";

const mocConnection = (html: string, fn?: (x: any, c: any) => void) =>
  connect((url, ctx) => {
    if (fn) fn(url, ctx);
    return Promise.resolve({ markup: html, ctx });
  });

test("Example", async () => {
  const goTo = connect((url, ctx) =>
    Promise.resolve({
      markup: page(url as "/" | "/one"),
      ctx: { hostname: url },
    })
  );

  const result = await run(
    goTo(
      "/",
      fork({
        title: join($("title"), text),
        posts: join(
          $$("li"),
          each(
            fork({
              title: join($("h4"), text),
              body: join($("p"), text),
              bod_html: join($("p"), html),
              image: goTo(
                join($("a"), attr("href")),
                fork({
                  src: join($("img"), attr("src")),
                })
              ),
            })
          )
        ),
      })
    ),
    { hostname: "" }
  )();

  if (isLeft(result)) throw result.left;
  console.log(result.right);
});

it("Should return DOM AST", async () => {
  const fn = jest.fn();
  const goTo = mocConnection(`<h1>hello</h1>`, fn);
  const result = await run(
    goTo("/", (r) => TE.of(r)),
    { hostname: "http://helloworld.com" }
  )();
  if (isLeft(result)) throw result.left;
  expect(fn.mock.calls[0]).toEqual([
    "/",
    { hostname: "http://helloworld.com" },
  ]);
  expect(result.right.data).toEqual(parseDOM(`<h1>hello</h1>`));
});

it("Should return first node matching a css selector", async () => {
  const goTo = mocConnection(
    `<div><h1>hello</h1><h2>world</h2><h2>something</h2></div>`
  );
  const result = await run(goTo("", $("h2")))();
  if (isLeft(result)) throw result.left;
  expect(du.isTag(result.right) && result.right.name == "h2").toBe(true);
});

it("Should return all nodes matching a css selector", async () => {
  const goTo = mocConnection(`<div><h1>hello</h1><h2>world</h2></div>`);
  const result = await run(goTo("", $$("div > *")))();
  if (isLeft(result)) throw result.left;
  expect(result.right.length).toBe(2);
  expect(
    du.isTag(result.right[0]) && (result.right[0] as any).name == "h1"
  ).toBe(true);
  expect(
    du.isTag(result.right[1]) && (result.right[1] as any).name == "h2"
  ).toBe(true);
});

it("Should join multipe shears together", async () => {
  const goTo = mocConnection(
    `<div><ul><li><h1>foo</h1></li><li></li></ul></div>`
  );
  const result = await run(goTo("", join($("ul"), $("li"), $("h1"))))();
  if (isLeft(result)) throw result.left;
  expect(du.isTag(result.right) && (result.right as any).name == "h1").toBe(
    true
  );
});

it("Should return parent node", async () => {
  const goTo = mocConnection(`<div><section><h1>foobar</h1></section></div>`);
  const result = await run(goTo("", join($("h1"), parent)))();
  if (isLeft(result)) throw result.left;
  expect(
    du.isTag(result.right) && (result.right as any).name == "section"
  ).toBe(true);
});

it("Should return sibling nodes", async () => {
  const goTo = mocConnection(
    `<div><h1>one</h1><h2>two</h2><h3>three</h3></div>`
  );
  const result = await run(goTo("", join($("h1"), siblings)))();
  if (isLeft(result)) throw result.left;
  expect(result.right.map((x) => (du.isTag(x) ? x.name : x.type))).toEqual([
    "h1",
    "h2",
    "h3",
  ]);
});

it("Should return next node sibling", async () => {
  const goTo = mocConnection(
    `<div><h1>one</h1><h2>two</h2><h3>three</h3></div>`
  );
  const result = await run(goTo("", join($("h1"), nextSibling)))();
  if (isLeft(result)) throw result.left;
  expect(du.isTag(result.right) && (result.right as any).name == "h2").toBe(
    true
  );
});

it("Should return recursively concatonate all inner text nodes", async () => {
  const goTo = mocConnection(
    `<div><h1>one</h1><h2>two</h2><h3>three</h3></div>`
  );
  const result = await run(goTo("", text))();
  if (isLeft(result)) throw result.left;
  expect(result.right).toBe("onetwothree");
});

it("Should return serialized dom nodes", async () => {
  const goTo = mocConnection(
    `<div><h1>one</h1><h2>two</h2><h3>three</h3></div>`
  );
  const result = await run(goTo("", html))();
  if (isLeft(result)) throw result.left;
  expect(result.right).toBe(
    "<div><h1>one</h1><h2>two</h2><h3>three</h3></div>"
  );
});

it("Should return all node attributes", async () => {
  const goTo = mocConnection(
    `<div style="background:blue" role="button">click me</div>`
  );
  const result = await run(goTo("", join($("div"), attributes)))();
  if (isLeft(result)) throw result.left;
  expect(result.right).toEqual({ style: "background:blue", role: "button" });
});

it("Should return single node attribute", async () => {
  const goTo = mocConnection(
    `<div style="background:blue" role="button">click me</div>`
  );
  const result = await run(goTo("", join($("div"), attr("style"))))();
  if (isLeft(result)) throw result.left;
  expect(result.right).toEqual("background:blue");
});

it("Should resolve object structured shears selectors", async () => {
  const goTo = mocConnection(`<div><h1>foo</h1><h2>bar</h2></div>`);
  const result = await run(
    goTo("", fork({ h1: join($("h1"), text), h2: join($("h2"), text) }))
  )();
  if (isLeft(result)) throw result.left;
  expect(result.right).toEqual({ h1: "foo", h2: "bar" });
});

it("Should resolve array structured shears selectors", async () => {
  const goTo = mocConnection(`<div><h1>foo</h1><h2>bar</h2></div>`);
  const result = await run(
    goTo("", fork([join($("h1"), text), join($("h2"), text)]))
  )();
  if (isLeft(result)) throw result.left;
  expect(result.right).toEqual(["foo", "bar"]);
});

it("Should run shears selector on array of inputs", async () => {
  const goTo = mocConnection(
    `<ul><li><h1>one</h1></li><li><h1>two</h1></li><li><h1>three</h1></li></ul>`
  );
  const result = await run(
    goTo("", join($$("li"), each(join($("h1"), text))))
  )();
  if (isLeft(result)) throw result.left;
  expect(result.right).toEqual(["one", "two", "three"]);
});

const page = (route: "/" | "/one" | "/two") =>
  ({
    ["/"]: `
      <!DOCTYPE html>
      <html>
          <head><title>Shears Test HTML</title></head>
          <body>
              <h1>Shears</h1>
              <h3>Scraping made pretty</h3>
              <section id="posts">
                <h2>Recent updates</h2>
                <ul>
                  <li>
                    <h4>Update 1</h4>
                    <p>lorem ipsum</p>
                    <a href="/one">go to update 1</a>
                  </li>
                  <li>
                    <h4>Update 2</h4>
                    <p>lorem ipsum</p>
                    <a href="/two">go to update 1</a>
                  </li>
                </ul>
              </section>
          </body>
      </html>
  `,
    ["/one"]: `
    <!DOCTYPE html>
    <html>
        <head><title>Post One</title></head>
        <body>
            <img src="one.jpeg" />
        </body>
    </html>
  `,
    ["/two"]: `
    <!DOCTYPE html>
    <html>
        <head><title>Post Two</title></head>
        <body>
          <img src="two.jpeg" />
        </body>
    </html>
  `,
  }[route]);
