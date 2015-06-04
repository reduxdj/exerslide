# exerslide

A tool to generate simple HTML slideshows/tutorials (from text files). The
primary intent is to generate interactive presentations for teaching web
technologies.
As such, the focus is on easy content production, with lean styles and less on
fancy animations.

Exerslide includes specific slide [layouts][] for writing and evaluating
JavaScript and HTML.

## API

```sh
$ exerslide --help

Usage: exerslide <path> [options]

path     Path to slides to convert

Options:
   -o DIR, --out-dir DIR   Directory to save the presentation in  [./]
   -w, --watch             Monitor slides and static files for changes
```


## Basic Usage

```sh
exerslide path/to/slides --out presentation/
```

This will process the files in `path/to/slides`, resolve JS and CSS
dependencies  and will copy all generated files (HTML, JS, CSS) to
`presentation/`.

## Concepts

### Slides

Slides are defined as text files which contain *content* and *meta data*. The
meta data is defined in the [YAML][] front matter, followed by the content:

```text
title: Title of the slide
whatever: you want here
---
This is the content
```

#### Organizing Slides

exerslide determines the order of the slides by sorting the file names
alphabetically. For example, if you name your slides as

```text
slides/
  00-Intro.md
  01-MainTopic.md
  02-End.md
```

exerslide will pick up the slides in that order.

**Note:** Aside from the order aspect, you can name the files however you want.

Slides can be grouped as **chapters** by putting all slides of a chapter into a
folder. For example:

```text
slides/
  00-Intro.md
  01-chapter1/
    00-Problem.md
    01-Solution.md
  02-Summary.md
```

Like with filenames, exerslide doesn't care about the actual name of the
folder.

### Meta data

Which meta data to provide depends on the [**Layout**][layouts] that is used for
the slide (more about that later). However, there are some keys which have a
predefined meaning:

- `title`: The value of `title` will be rendered as an `<h2>` element above the
  content.
- `toc`: The name to show in the table of contents. If not present, `title`
  will be used. If that one is not present either, it will show "Slide X" where
  X is the index of the slide.
- `layout`: The name of the layout to use (overwrites layout inference).
- `chapter`: The name of the chapter this slide belongs to to. It serves two
  purposes:

    1. It can be used as alternative to group slides by chapter (i.e. you don't
       have to use folders if you don't want to).
    2. This name will be shown for the chapter in the progress bar of the
       presentation. If you organize your slides in folders, you only have to
       define this key in the first slide of the folder. All other slides
       "inherit" the chapter name from the first slide.

### Layouts

Layouts define how the content (and meta-data) of a slide are rendered.
For example the [Markdown layout][] parses the slide content as markdown.

Layouts are implemented as [React][] components, which allows you to create
arbitrarily complex layouts. For example the [JavaScriptExercise layout][]
renders a text editor containing the slide's content and contains logic to
validate the user's solution.

Which layout to use for a slide is determined by the following process:

1. The slide's `layout` meta-data field.
2. If not present, the layout is inferred from the file extension. The mapping
  can be [configured][configuration].
3. If it can't be inferred, no layout is used. The slide content will be treated as HTML.

Usually it makes sense to set up a default mapping that applies to most slides
in the project (e.g. by default `.md` maps to the Markdown layout), and use the
`layout` field for special layouts.

[Markdown layout]: layouts/Markdown.js
[JavaScriptExercise layout]: layouts/JavaScriptExercise.js

#### Layout resolution

Both, the `layout` field and the file extension mapping expect the *layout name*
as value. These names are used to search for files with the same names in the
configured search paths for layouts (see [Configuration][]).

Example: Given the slide

```txt
layout: FooBar
---
Some FooBar here.
```

and the layout search paths `['layouts/', 'defaultLayouts/']`, exerslide would
first search for a file `layouts/FooBar.xxx`, and if not found for
`defaultLayouts/FooBar.xxx` (the file extension doesn't matter, hence `.xxx` in
this example).

#### Master layout

As layouts define the structure of a slide, the master layout defines the
structure of the whole page. The [default master layout][master layout] doesn't
do much: It renders a table-of-contents / progress component and the current
slide.

Just like other layouts, the master layout is a React component and it can be
configured which one to use (see [Configuration][]).

### Styles

All CSS files are bundle into a single CSS file. They are ordered in such a way
that it makes it easy to overwrite predefined files. Styles can come from
multiple sources and they are bundled in this order:

1. **Component styles**: Components used in layouts can specify paths to CSS
  files that are required for rendering the component. Those paths can be
  define via `@css` doclets in docblocks:

    ```js
    /**
     * @css path/to/file.css
     */
    class Component {...}
    ```

  See [Editor][] for an example. This component uses [CodeMirror][] which
  requires some default styles to function properly.

2. **Default styles**: exerslide comes with a minimal set of default styles to
  generate useful presentations. See [template/css](template/css). In
  particular, the default set of styles includes [bootstrap][].

3. **"Project" styles**: Styles defined by you via the [configuration][] file of
  the presentation.

[editor]: components/Editor.js
[codemirror]: http://codemirror.net/
[bootstrap]: http://getbootstrap.com/

## Configuration

exerslide can be configured either via an `.exersliderc` file (see the [default
configuration][] for example) or via `package.json` with the `exerslide` key.

Currently the following configuration options are supported:

- `masterLayout`: Path to the React component that should be used as master
  layout.
    ```js
    "masterLayout": "path/to/MasterLayout.js",
    ```

    See the default [master layout][] for which props it should accept.
- `layouts`: An *array* of paths to *folders* containing layout components. The
  first matching component will be used.
    ```js
    "layouts": [
      "path/to/layouts",
      "another/path/to/layouts"
    ],
    ```

- `styles`: An *array* of paths to CSS files (local or URL). The files are
  bundled in the specified order. Use this to override default styles.
    ```js
    "styles": [
      "http://url.to/some/style.css",
      "customStyle.css"
    ],
    ```

- `defaultLayouts`: An *object* describing a *file extension -> layout*
  mapping. For each slide that does not specify `layout` in its meta data, the
  file extension will be looked up in here.
    ```js
    "defaultLayouts": {
      ".md": "Markdown",
      ".js": "JavaScriptExercise"
    },
    ```

- `statics`: An *array* of *paths* to static files. Static files are simply
  copied to the output folder.
    ```js
    "statics": [
      "index.html",
      "SourceCodePro-regular.otf"
    ],
    ```

- `meta`: An arbitrary object. Static text files are passed through
  [lodash][]'s `template` method. You can use its template syntax to refer to
  information stored in this object. For example, the
  [default `index.html`][index.html] file
  contains
    ```html
    <title><%= META.title %></title>
    ```

    `<%= META.title %>` will be substituted by the value of `title` in

    ```js
    "meta": {
      "title": "ExampleTitle"
    },
    ```

## CLI options

### `--out`, `-o`

The directory to store the presentation in.

### `--watch`, `-w`

Automatically regenerate the presentation when

- Slides change
- CSS files change
- JS files referenced by layouts change

In addition, the bundled JS and CSS files are not minified, which makes this a
useful mode to create your content or develop new layouts.

**Note:** If you make changes to config files or exerslide's source, you
have to rerun the command.

[default configuration]: template/.exersliderc
[index.html]: template/index.html

[master layout]: ./components/MasterLayout.js
[React]: http://facebook.github.io/react/
[yaml]: https://en.wikipedia.org/wiki/YAML
[lodash]: https://lodash.com/
