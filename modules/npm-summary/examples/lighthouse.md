<package.json> { "name": "lighthouse", "version": "12.4.0", "main":
"./core/index.js", "dependencies": { "@paulirish/trace_engine": "0.0.44",
"@sentry/node": "^7.0.0", "axe-core": "^4.10.2", "chrome-launcher": "^1.1.2",
"configstore": "^5.0.1", "csp_evaluator": "1.1.5", "devtools-protocol":
"0.0.1423531", "enquirer": "^2.3.6", "http-link-header": "^1.1.1",
"intl-messageformat": "^10.5.3", "jpeg-js": "^0.4.4", "js-library-detector":
"^6.7.0", "lighthouse-logger": "^2.0.1", "lighthouse-stack-packs": "1.12.2",
"lodash-es": "^4.17.21", "lookup-closest-locale": "6.2.0",
"metaviewport-parser": "0.3.0", "open": "^8.4.0", "parse-cache-control":
"1.0.1", "puppeteer-core": "^24.3.0", "robots-parser": "^3.0.1", "semver":
"^5.3.0", "speedline-core": "^1.4.3", "third-party-web": "^0.26.5",
"tldts-icann": "^6.1.16", "ws": "^7.0.0", "yargs": "^17.3.1", "yargs-parser":
"^21.0.0" } } </package.json>

<Entrypoints>
No entry points defined in package.json
</Entrypoints>

<TypeScript Exports>
Main types file (cli/index.d.ts):

Total declaration files: 475 </TypeScript Exports>

<README>
# Lighthouse  [![GitHub Actions Status Badge](https://github.com/GoogleChrome/lighthouse/workflows/CI/badge.svg)](https://github.com/GoogleChrome/lighthouse/actions/workflows/ci.yml) [![GitHub Actions Status Badge](https://github.com/GoogleChrome/lighthouse/workflows/unit/badge.svg)](https://github.com/GoogleChrome/lighthouse/actions/workflows/unit.yml) [![GitHub Actions Status Badge](https://github.com/GoogleChrome/lighthouse/workflows/smoke/badge.svg)](https://github.com/GoogleChrome/lighthouse/actions/workflows/smoke.yml) [![Coverage Status](https://codecov.io/gh/GoogleChrome/lighthouse/branch/main/graph/badge.svg)](https://codecov.io/gh/GoogleChrome/lighthouse) [![Build tracker for Lighthouse](https://img.shields.io/badge/buildtracker-ok-blue)](https://lh-build-tracker.herokuapp.com/) [![NPM lighthouse package](https://img.shields.io/npm/v/lighthouse.svg)](https://npmjs.org/package/lighthouse)

> Lighthouse analyzes web apps and web pages, collecting modern performance
> metrics and insights on developer best practices.

- Using Lighthouse
  - [Using Lighthouse in Chrome DevTools](#using-lighthouse-in-chrome-devtools)
  - [Using the Chrome extension](#using-the-chrome-extension)
  - [Using the Node CLI](#using-the-node-cli)
    - [CLI options](#cli-options)
  - [Using the Node module](#using-the-node-module)
  - [Viewing a report](#viewing-a-report)
    - [Online Viewer](#online-viewer)
  - [Docs & Recipes](#docs--recipes)
  - [Developing Lighthouse](#develop)
    - [Setup](#setup)
    - [Run](#run)
    - [Tests](#tests)
    - [Docs](#docs)
- Associated Products and Projects
  - [Lighthouse Integrations in Web Perf services](#lighthouse-integrations-in-web-perf-services)
  - [Lighthouse Integrations in non-Web Perf services](#lighthouse-integrations-in-non-web-perf-services)
  - [Plugins](#plugins)
  - [Related projects](#related-projects)
- [FAQ](#faq)
  - [How does Lighthouse work?](#how-does-lighthouse-work)
  - [Can I configure the lighthouse run?](#can-i-configure-the-lighthouse-run)
  - [How does Lighthouse use network throttling, and how can I make it better?](#how-does-lighthouse-use-network-throttling-and-how-can-i-make-it-better)
  - [Are results sent to a remote server?](#are-results-sent-to-a-remote-server)
  - [How do I get localized Lighthouse results?](#how-do-i-get-localized-lighthouse-results-via-the-cli)
  - [How do I author custom audits to extend Lighthouse?](#how-do-i-author-custom-audits-to-extend-lighthouse)
  - [How do I contribute?](#how-do-i-contribute)

## Using Lighthouse in Chrome DevTools

Lighthouse is integrated directly into the Chrome DevTools, under the
"Lighthouse" panel.

**Installation**: install [Chrome](https://www.google.com/chrome/browser).

**Run it**: open Chrome DevTools, select the Lighthouse panel, and hit "Generate
report".

<img width="550" alt="Lighthouse integration in Chrome DevTools." src="https://user-images.githubusercontent.com/2766281/204185043-9c49abe5-baee-4b26-b5ce-ece410661213.png">

## Using the Chrome extension

The Chrome extension was available prior to Lighthouse being available in Chrome
Developer Tools, and offers similar functionality.

**Installation**:
[install the extension](https://chrome.google.com/webstore/detail/lighthouse/blipmdconlkpinefehnmjammfjpmpbjk)
from the Chrome Web Store.

**Run it**: follow the
[extension quick-start guide](https://developers.google.com/web/tools/lighthouse/#extension).

## Using the Node CLI

The Node CLI provides the most flexibility in how Lighthouse runs can be
configured and reported. Users who want more advanced usage, or want to run
Lighthouse in an automated fashion should use the Node CLI.

> **Note** Lighthouse requires Node 18 LTS (18.x) or later.

**Installation**:

```sh
npm install -g lighthouse
# or use yarn:
# yarn global add lighthouse
```

**Run it**: `lighthouse https://airhorner.com/`

By default, Lighthouse writes the report to an HTML file. You can control the
output format by passing flags.

### CLI options

<!-- To update the help output:
  node cli --help | pbcopy
-->

```
$ lighthouse --help

lighthouse <url> <options>

Logging:
  --verbose  Displays verbose logging  [boolean] [default: false]
  --quiet    Displays no progress, debug logs, or errors  [boolean] [default: false]

Configuration:
  --save-assets                  Save the trace contents & devtools logs to disk  [boolean] [default: false]
  --list-all-audits              Prints a list of all available audits and exits  [boolean] [default: false]
  --list-trace-categories        Prints a list of all required trace categories and exits  [boolean] [default: false]
  --additional-trace-categories  Additional categories to capture with the trace (comma-delimited).  [string]
  --config-path                  The path to the config JSON.
                                 An example config file: core/config/lr-desktop-config.js  [string]
  --preset                       Use a built-in configuration.
                                 WARNING: If the --config-path flag is provided, this preset will be ignored.  [string] [choices: "perf", "experimental", "desktop"]
  --chrome-flags                 Custom flags to pass to Chrome (space-delimited). For a full list of flags, see https://bit.ly/chrome-flags
                                 Additionally, use the CHROME_PATH environment variable to use a specific Chrome binary. Requires Chromium version 66.0 or later. If omitted, any detected Chrome Canary or Chrome stable will be used.  [string] [default: ""]
  --port                         The port to use for the debugging protocol. Use 0 for a random port  [number] [default: 0]
  --hostname                     The hostname to use for the debugging protocol.  [string] [default: "localhost"]
  --form-factor                  Determines how performance metrics are scored and if mobile-only audits are skipped. For desktop, --preset=desktop instead.  [string] [choices: "mobile", "desktop"]
  --screenEmulation              Sets screen emulation parameters. See also --preset. Use --screenEmulation.disabled to disable. Otherwise set these 4 parameters individually: --screenEmulation.mobile --screenEmulation.width=360 --screenEmulation.height=640 --screenEmulation.deviceScaleFactor=2
  --emulatedUserAgent            Sets useragent emulation  [string]
  --max-wait-for-load            The timeout (in milliseconds) to wait before the page is considered done loading and the run should continue. WARNING: Very high values can lead to large traces and instability  [number]
  --enable-error-reporting       Enables error reporting, overriding any saved preference. --no-enable-error-reporting will do the opposite. More: https://github.com/GoogleChrome/lighthouse/blob/main/docs/error-reporting.md  [boolean]
  --gather-mode, -G              Collect artifacts from a connected browser and save to disk. (Artifacts folder path may optionally be provided). If audit-mode is not also enabled, the run will quit early.
  --audit-mode, -A               Process saved artifacts from disk. (Artifacts folder path may be provided, otherwise defaults to ./latest-run/)
  --only-audits                  Only run the specified audits  [array]
  --only-categories              Only run the specified categories. Available categories: accessibility, best-practices, performance, seo  [array]
  --skip-audits                  Run everything except these audits  [array]
  --disable-full-page-screenshot Disables collection of the full page screenshot, which can be quite large  [boolean]

Output:
  --output       Reporter for the results, supports multiple values. choices: "json", "html", "csv"  [array] [default: ["html"]]
  --output-path  The file path to output the results. Use 'stdout' to write to stdout.
                   If using JSON output, default is stdout.
                   If using HTML or CSV output, default is a file in the working directory with a name based on the test URL and date.
                   If using multiple outputs, --output-path is appended with the standard extension for each output type. "reports/my-run" -> "reports/my-run.report.html", "reports/my-run.report.json", etc.
                   Example: --output-path=./lighthouse-results.html  [string]
  --view         Open HTML report in your browser  [boolean] [default: false]

Options:
  --version                            Show version number  [boolean]
  --help                               Show help  [boolean]
  --cli-flags-path                     The path to a JSON file that contains the desired CLI flags to apply. Flags specified at the command line will still override the file-based ones.
  --locale                             The locale/language the report should be formatted in
  --blocked-url-patterns               Block any network requests to the specified URL patterns  [array]
  --disable-storage-reset              Disable clearing the browser cache and other storage APIs before a run  [boolean]
  --throttling-method                  Controls throttling method  [string] [choices: "devtools", "provided", "simulate"]
  --throttling
  --throttling.rttMs                   Controls simulated network RTT (TCP layer)
  --throttling.throughputKbps          Controls simulated network download throughput
  --throttling.requestLatencyMs        Controls emulated network RTT (HTTP layer)
  --throttling.downloadThroughputKbps  Controls emulated network download throughput
  --throttling.uploadThroughputKbps    Controls emulated network upload throughput
  --throttling.cpuSlowdownMultiplier   Controls simulated + emulated CPU throttling
  --extra-headers                      Set extra HTTP Headers to pass with request
  --precomputed-lantern-data-path      Path to the file where lantern simulation data should be read from, overwriting the lantern observed estimates for RTT and server latency.  [string]
  --lantern-data-output-path           Path to the file where lantern simulation data should be written to, can be used in a future run with the `precomputed-lantern-data-path` flag.  [string]
  --plugins                            Run the specified plugins  [array]
  --channel  [string] [default: "cli"]
  --chrome-ignore-default-flags  [boolean] [default: false]

Examples:
  lighthouse <url> --view                                                                          Opens the HTML report in a browser after the run completes
  lighthouse <url> --config-path=./myconfig.js                                                     Runs Lighthouse with your own configuration: custom audits, report generation, etc.
  lighthouse <url> --output=json --output-path=./report.json --save-assets                         Save trace, screenshots, and named JSON report.
  lighthouse <url> --screenEmulation.disabled --throttling-method=provided --no-emulatedUserAgent  Disable device emulation and all throttling
  lighthouse <url> --chrome-flags="--window-size=412,660"                                          Launch Chrome with a specific window size
  lighthouse <url> --quiet --chrome-flags="--headless"                                             Launch Headless Chrome, turn off logging
  lighthouse <url> --extra-headers "{\"Cookie\":\"monster=blue\", \"x-men\":\"wolverine\"}"        Stringify'd JSON HTTP Header key/value pairs to send in requests
  lighthouse <url> --extra-headers=./path/to/file.json                                             Path to JSON file of HTTP Header key/value pairs to send in requests
  lighthouse <url> --only-categories=performance,seo                                               Only run the specified categories. Available categories: accessibility, best-practices, performance, seo

For more information on Lighthouse, see https://developers.google.com/web/tools/lighthouse/.
```

##### Output Examples

```sh
lighthouse
# saves `./<HOST>_<DATE>.report.html`

lighthouse --output json
# json output sent to stdout

lighthouse --output html --output-path ./report.html
# saves `./report.html`

# NOTE: specifying an output path with multiple formats ignores your specified extension for *ALL* formats
lighthouse --output json --output html --output-path ./myfile.json
# saves `./myfile.report.json` and `./myfile.report.html`

lighthouse --output json --output html
# saves `./<HOST>_<DATE>.report.json` and `./<HOST>_<DATE>.report.html`

lighthouse --output-path=~/mydir/foo.out --save-assets
# saves `~/mydir/foo.report.html`
# saves `~/mydir/foo-0.trace.json` and `~/mydir/foo-0.devtoolslog.json`

lighthouse --output-path=./report.json --output json
# saves `./report.json`
```

##### Lifecycle Examples

You can run a subset of Lighthouse's lifecycle if desired via the
`--gather-mode` (`-G`) and `--audit-mode` (`-A`) CLI flags.

```sh
lighthouse http://example.com -G
# launches browser, collects artifacts, saves them to disk (in `./latest-run/`) and quits

lighthouse http://example.com -A
# skips browser interaction, loads artifacts from disk (in `./latest-run/`), runs audits on them, generates report

lighthouse http://example.com -GA
# Normal gather + audit run, but also saves collected artifacts to disk for subsequent -A runs.


# You can optionally provide a custom folder destination to -G/-A/-GA. Without a value, the default will be `$PWD/latest-run`.
lighthouse -GA=./gmailartifacts https://gmail.com
```

#### Notes on Error Reporting

The first time you run the CLI you will be prompted with a message asking you if
Lighthouse can anonymously report runtime exceptions. The Lighthouse team uses
this information to detect new bugs and avoid regressions. Opting out will not
affect your ability to use Lighthouse in any way.
[Learn more](https://github.com/GoogleChrome/lighthouse/blob/main/docs/error-reporting.md).

## Using the Node module

You can also use Lighthouse programmatically with the Node module.

Read
[Using Lighthouse programmatically](./docs/readme.md#using-programmatically) for
help getting started.\
Read [Lighthouse Configuration](./docs/configuration.md) to learn more about the
configuration options available.

## Viewing a report

Lighthouse can produce a report as JSON or HTML.

HTML report:

<img src="https://raw.githubusercontent.com/GoogleChrome/lighthouse/443ff2c8a297dfd2297dfaca86c4966a87c8574a/assets/example_audit.png" alt="Lighthouse example audit" width="500px">

### Online Viewer

Running Lighthouse with the `--output=json` flag generates a JSON dump of the
run. You can view this report online by visiting
<https://googlechrome.github.io/lighthouse/viewer/> and dragging the file onto
the app. You can also use the "Export" button from the top of any Lighthouse
HTML report and open the report in the
[Lighthouse Viewer](https://googlechrome.github.io/lighthouse/viewer/).

In the Viewer, reports can be shared by clicking the share icon in the top right
corner and signing in to GitHub.

> **Note**: shared reports are stashed as a secret Gist in GitHub, under your
> account.

## Docs & Recipes

Useful documentation, examples, and recipes to get you started.

**Docs**

- [Dealing with variance](./docs/variability.md)
- [Using Lighthouse programmatically](./docs/readme.md#using-programmatically)
- [Testing a site with authentication](./docs/authenticated-pages.md)
- [Developing Plugins](./docs/plugins.md)
- [Making a New Audit](./docs/new-audits.md)
- [Testing on a mobile device](./docs/readme.md#testing-on-a-mobile-device)
- [Lighthouse Architecture](./docs/architecture.md)

**Recipes**

- [Plugin](./docs/recipes/lighthouse-plugin-example) - example Lighthouse plugin
- [Custom Audit example](./docs/recipes/custom-audit) - extend Lighthouse, run
  your own audits

**Videos**

The session from Google I/O 2018 covers the new performance engine, upcoming
Lighthouse REST API, and using the Chrome UX report to evaluate real-user data.

[![Watch the Lighthouse @ Google I/O 2018 session.](https://img.youtube.com/vi/UvK9zAsSM8Q/0.jpg)](https://www.youtube.com/watch?v=UvK9zAsSM8Q)

The session from Google I/O 2017 covers architecture, writing custom audits,
GitHub/Travis/CI integration, headless Chrome, and more:

[![Watch the Lighthouse @ Google I/O 2017 session.](https://img.youtube.com/vi/NoRYn6gOtVo/0.jpg)](https://www.youtube.com/watch?v=NoRYn6gOtVo)

_Click the image to watch the video on YouTube._

## Develop

Read on for the basics of hacking on Lighthouse. Also, see
[Contributing](./CONTRIBUTING.md) for detailed information.

### Setup

```sh
# yarn should be installed first

git clone https://github.com/GoogleChrome/lighthouse

cd lighthouse
yarn
yarn build-all
```

### Run

```sh
node cli http://example.com
# append --chrome-flags="--no-sandbox --headless --disable-gpu" if you run into problems connecting to Chrome
```

> **Getting started tip**: `node --inspect-brk cli http://example.com` to open
> up Chrome DevTools and step through the entire app. See
> [Debugging Node.js with Chrome DevTools](https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27#.59rma3ukm)
> for more info.

### Tests

```sh
# lint and test all files
yarn test

# run all unit tests
yarn unit

# run a given unit test (e.g. core/test/audits/byte-efficiency/uses-long-cache-ttl-test.js)
yarn mocha uses-long-cache-ttl

# watch for file changes and run tests
#   Requires http://entrproject.org : brew install entr
yarn watch

## run linting, unit, and smoke tests separately
yarn lint
yarn unit
yarn smoke

## run tsc compiler
yarn type-check
```

### Docs

Some of our docs have tests that run only in CI by default. To modify our
documentation, you'll need to run `yarn build-pack && yarn test-docs` locally to
make sure they pass.

**Additional Dependencies**

- `brew install jq`

## Lighthouse Integrations in Web Perf services

This section details services that have integrated Lighthouse data. If you're
working on a cool project integrating Lighthouse and would like to be featured
here, file an issue to this repo or tweet at us
[@_____lighthouse](https://twitter.com/____lighthouse)!

- **[Web Page Test](https://www.webpagetest.org)** — An
  [open source](https://github.com/WPO-Foundation/webpagetest) tool for
  measuring and analyzing the performance of web pages on real devices. Users
  can choose to produce a Lighthouse report alongside the analysis of
  WebPageTest results.

- **[HTTPArchive](http://httparchive.org/)** - HTTPArchive tracks how the web is
  built by crawling 500k pages with Web Page Test, including Lighthouse results,
  and stores the information in BigQuery where it is
  [publicly available](https://discuss.httparchive.org/t/quickstart-guide-to-exploring-the-http-archive/682).

- **[Calibre](https://calibreapp.com)** - Calibre is a comprehensive performance
  monitoring platform running on Lighthouse. See the performance impact of your
  work before it hits production with GitHub Pull Request Reviews. Track the
  impact of Third Party scripts. Automate your performance system with a
  developer-first Node.js API. Try Calibre with a free 15-day trial.

- **[DebugBear](https://www.debugbear.com/)** - DebugBear is a website
  monitoring tool based on Lighthouse. See how your scores and metrics changed
  over time, with a focus on understanding what caused each change. DebugBear is
  a paid product with a free 30-day trial.

- **[Treo](https://treo.sh)** - Treo is Lighthouse as a Service. It provides
  regression testing, geographical regions, custom networks, and integrations
  with GitHub & Slack. Treo is a paid product with plans for solo-developers and
  teams.

- **[PageVitals](https://pagevitals.com)** - PageVitals combines Lighthouse,
  CrUX and field testing to monitor the performance of websites. See how your
  website performs over time and get alerted if it gets too slow. Drill down and
  find the real cause of any performance issue. PageVitals is a paid product
  with a free 14-day trial.

- **[Screpy](https://screpy.com)** - Screpy is a web analysis tool that can
  analyze all pages of your websites in one dashboard and monitor them with your
  team. It's powered by Lighthouse and it also includes some different analysis
  tools (SERP, W3C, Uptime, etc). Screpy has free and paid plans.

- **[Siteimprove Performance](https://siteimprove.com/en/performance/)** —
  Siteimprove Performance is a web Performance monitoring solution that enables
  a marketer, manager or decision maker to understand and optimize website load
  times. Get easy-to-use insights with a focus on quick and impactful wins.
  Siteimprove Performance is a paid product with a free 14-day trial.

- **[SpeedCurve](https://speedcurve.com)** — SpeedCurve is a tool for
  continuously monitoring web performance across different browsers, devices,
  and regions. It can aggregate any metric including Lighthouse scores across
  multiple pages and sites, and allows you to set performance budgets with Slack
  or email alerts. SpeedCurve is a paid product with a free 30-day trial.

- **[Foo](https://www.foo.software/lighthouse)** - Lighthouse-as-a-service
  offering free and premium plans. Provides monitoring and historical reporting
  of Lighthouse audits with CircleCI, GitHub, and other integrations. Features
  include Slack notifications, PR comment reporting and more.

- **[Apdex](https://apdex.co)** - Apdex is a website performance service. The
  main features are historical Lighthouse report visualizations, mobile/desktop
  options, alerts, uptime monitoring, and more. There are flexible paid plans
  and a 30-day free trial.

- **[Websu](https://websu.io)** - Websu is an open source project to provide
  Lighthouse-as-a-Service through a simple HTTP REST API. The main features are
  ability to host and deploy in your own environment and historical Lighthouse
  report summaries.

- **[DTEKT.IO](https://dtekt.io)** - DTEKT is a website performance and uptime
  monitoring service. It uses lighthouse to provide visibility into the
  performance of websites from multiple locations on multiple devices. It offers
  three months free trial and paid plans.

- **[SpeedVitals](https://speedvitals.com)** - SpeedVitals is a Lighthouse
  powered tool to measure web performance across multiple devices and locations.
  It has various features like Layout Shift Visualization, Waterfall Chart,
  Field Data and Resource Graphs. SpeedVitals offers both free and paid plans.

- **[Lighthouse Metrics](https://lighthouse-metrics.com/)** - Lighthouse Metrics
  gives you global performance insights with a single test. You can also monitor
  your websites on a daily or hourly base. Lighthouse Metrics offers free global
  one-time tests and performance monitoring as a paid feature with a free 14-day
  trial.

- **[Auditzy](https://auditzy.com)** - Auditzy™ is a robust website auditing &
  monitoring tool which lets you analyze your web page(s) pre-user journey.
  Analyze the Competitor Health Metric, Core Web Vitals, and Technology. Compare
  your web pages with your competitors to understand where you are leading or
  lagging. Real-time notification with Slack. Have Seamless Collaboration with
  Multiple Teams. Automate your Audits hourly, daily, weekly, and so on. It has
  a free trial with pay as you go plans.

- **[Lighthouse Metrics China](http://lighthousemetricschina.com)** - The first
  Lighthouse metrics tool specifically designed for China. Experience
  unparalleled website monitoring capabilities with Lighthouse. Gain insights
  into the fluctuations of your scores and metrics within the realm of the
  [Great Firewall of China](https://www.chinafirewalltest.co), enabling a
  comprehensive understanding of the factors influencing each change. Lighthouse
  Metrics China offers both free and paid plans.

- **[DeploymentHawk](https://deploymenthawk.com)** - DeploymentHawk is an
  automated site auditing tool powered by Lighthouse. Effortlessly catch
  performance, accessibility, and SEO issues before they impact your users.
  DeploymentHawk is a paid product with a free 7-day trial.

- **[Guardius](https://guardius.io)** - Guardius is a DevOps and DevSecOps SaaS
  platform that integrates Lighthouse to deliver automated web performance
  analysis. It not only provides metrics evaluation and automatic scanning but
  also enables performance comparisons across different periods and ongoing
  observation over time. Additionally, Guardius offers predefined and customized
  alerts tailored to your specific requirements. A free version of Guardius is
  available for users to explore its features.

- **[Sonā](https://getsona.io)** - Powered by Lighthouse amongst others, Sonā
  delivers in-depth insights into your website’s health. Track changes over
  time, share reports, and receive actionable recommendations to improve
  performance, accessibility, SEO, best practices, and security. Sonā is free
  during its beta period.

## Lighthouse Integrations in non-Web Perf services

- **[PageWatch](https://pagewatch.dev/)** — PageWatch is a tool to find problem
  pages on your website. It provides insights into spelling errors, layout
  issues, slow pages (powered by Lighthouse) and more. PageWatch is offered via
  free and paid plans.

- **[Fluxguard](https://fluxguard.com/)** - Fluxguard provides website DOM
  change monitoring orchestrated with Google Puppeteer, and audited by
  Lighthouse. Fluxguard is a freemium product, with monthly monitoring of up to
  75 pages for free.

- **[Microlink](https://microlink.io)** — Microlink is a cloud browser as API.
  It offers Lighthouse reports on demand, making it easy to build any service on
  top. Similar functionality is available via the underlying open-source project
  named browserless.

- **[Wattspeed](https://wattspeed.com/)** — Wattspeed is a free tool that
  generates snapshots - historical captures of your web pages that include
  Lighthouse scores, a list of technologies, W3C HTML validator results, DOM
  size, mixed content info, and more.

## Plugins

- **[lighthouse-plugin-field-performance](https://github.com/treosh/lighthouse-plugin-field-performance)** -
  a plugin that adds real-user performance metrics for the URL using the data
  from
  [Chrome UX Report](https://developers.google.com/web/tools/chrome-user-experience-report/).

- **[lighthouse-plugin-publisher-ads](https://github.com/googleads/publisher-ads-lighthouse-plugin)** -
  a tool to improve ad speed and overall quality through a series of automated
  audits. At the moment, this is primarily targeted at sites using Google Ad
  Manager. This tool will aid in resolving discovered problems, providing a tool
  to be used to evaluate effectiveness of iterative changes while suggesting
  actionable feedback.

- **[lighthouse-plugin-crux](https://github.com/dvelasquez/lighthouse-plugin-crux)** -
  a plugin that quickly gathers real-user-metrics data from the
  [Chrome UX Report API](https://developers.google.com/web/tools/chrome-user-experience-report/api/reference).

## Related projects

Other awesome open source projects that use Lighthouse.

- **[auto-lighthouse](https://github.com/TGiles/auto-lighthouse)** - a CLI for
  crawling a domain and generating mobile and desktop reports for each page.
- **[Exthouse](https://github.com/treosh/exthouse)** - Analyze the impact of a
  browser extension on web performance.
- **[Gimbal](https://labs.moduscreate.com/gimbal-web-performance-audit-budgeting)** -
  An [open source (MIT licensed)](https://github.com/ModusCreateOrg/gimbal) tool
  used to measure, analyze, and budget aspects of a web application. Gimbal also
  integrates reports with GitHub pull requests.
- **[Gradle Lighthouse Plugin](https://github.com/Cognifide/gradle-lighthouse-plugin)** -
  An open source Gradle plugin that runs Lighthouse tests on multiple URLs and
  asserts category score thresholds (useful in continuous integration).
- **[lighthouse-badges](https://github.com/emazzotta/lighthouse-badges)** -
  Generate gh-badges (shields.io) based on Lighthouse performance.
- **[lighthouse-batch](https://github.com/mikestead/lighthouse-batch)** - Run
  Lighthouse over a number of sites and generate a summary of their
  metrics/scores.
- **[lighthouse-batch-parallel](https://github.com/Carr1005/lighthouse-batch-parallel)** -
  Run multiple Lighthouse runs in parallel to accelerate the data collecting
  process, get the result stream (csv, json, js object) in your own process
  (warning: performance results may be volatile).
- **[lighthouse-check-action](https://github.com/foo-software/lighthouse-check-action)** -
  A GitHub Action to run Lighthouse in a workflow, featuring Slack notifications
  and report upload to S3.
- **[lighthouse-check-orb](https://circleci.com/orbs/registry/orb/foo-software/lighthouse-check)** -
  A CircleCI Orb to run Lighthouse in a workflow, featuring Slack notifications
  and report upload to S3.
- **[andreasonny83/lighthouse-ci](https://github.com/andreasonny83/lighthouse-ci)** -
  Run Lighthouse and assert scores satisfy your custom thresholds.
- **[GoogleChrome/lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci)** -
  (**official**) Automate running Lighthouse for every commit, viewing the
  changes, and preventing regressions.
- **[lighthouse-ci-action](https://github.com/treosh/lighthouse-ci-action)** - A
  GitHub Action that makes it easy to run Lighthouse in CI and keep your pages
  small using performance budgets.
- **[lighthouse-gh-reporter](https://github.com/carlesnunez/lighthouse-gh-reporter)** -
  Run Lighthouse in CI and report back in a comment on your pull requests
- **[lighthouse-jest-example](https://github.com/justinribeiro/lighthouse-jest-example)** -
  Gather performance metrics via Lighthouse and assert results with Jest; uses
  Puppeteer to start Chrome with network emulation settings defined by
  WebPageTest.
- **[lighthouse-lambda](https://github.com/Otterseer/lighthouse-lambda)** - Run
  Lighthouse on AWS Lambda with prebuilt stable desktop Headless Chrome.
- **[lighthouse-matchers](https://github.com/ackama/lighthouse-matchers)** -
  Provides RSpec matchers for executing and evaluating Google Chrome Lighthouse
  audit scores.
- **[lighthouse-mocha-example](https://github.com/rishichawda/lighthouse-mocha-example)** -
  Run Lighthouse performance tests with Mocha and chrome-launcher.
- **[lighthouse-monitor](https://github.com/verivox/lighthouse-monitor)** - Run
  Lighthouse against all your URLs. Send metrics to any backend you want, save
  all reports with automatic data retention, and compare any two results in a
  web UI.
- **[lighthouse-persist](https://github.com/foo-software/lighthouse-persist)** -
  Run Lighthouse and upload HTML reports to an AWS S3 bucket.
- **[lighthouse-viewer](https://github.com/dvelasquez/lighthouse-viewer/tree/main/packages/lighthouse-viewer)** -
  Render the Lighthouse JSON into a report, using the Lighthouse Report Renderer
  repackaged as UMD and ESM. Also available with React, Svelte and Vue wrappers.
- **[lighthouse4u](https://github.com/godaddy/lighthouse4u)** - LH4U provides
  Google Lighthouse as a service, surfaced by both a friendly UI+API, and backed
  by Elastic Search for easy querying and visualization.
- **[react-lighthouse-viewer](https://www.npmjs.com/package/react-lighthouse-viewer)** -
  Render a Lighthouse JSON report in a React Component.
- **[site-audit-seo](https://github.com/viasite/site-audit-seo)** - CLI tool for
  SEO site audit, crawl site, lighthouse each page. Output to console and tables
  in csv, xlsx, json, web or Google Drive.
- **[webpack-lighthouse-plugin](https://github.com/addyosmani/webpack-lighthouse-plugin)** -
  Run Lighthouse from a Webpack build.
- **[cypress-audit](https://github.com/mfrachet/cypress-audit)** - Run
  Lighthouse and Pa11y audits directly in your E2E test suites.
- **[laravel-lighthouse](https://github.com/adityadees/laravel-lighthouse)** -
  Google Lighthouse wrapper for laravel framework to run Google Lighthouse CLI
  with custom option and can automatically save result in your server directory.
- **[Neodymium](https://github.com/Xceptance/neodymium/wiki/Accessibility)** -
  The Neodymium test automation framework integrates Lighthouse for
  accessibility and Web Vitals verification, allowing programmatic validation
  and assertion of all audit values.

## FAQ

### How does Lighthouse work?

See [Lighthouse Architecture](./docs/architecture.md).

### Why is the performance score so low? It looks fine to me.

Lighthouse reports the performance metrics as they would be experienced by a
typical mobile user on a 4G connection and a mid-tier ~$200 phone. Even if it
loads quickly on your device and network, users in other environments will
experience the site very differently.

Read more in our [guide to throttling](./docs/throttling.md).

### Why does the performance score change so much?

Lighthouse performance scores will change due to inherent variability in web and
network technologies, even if there hasn't been a code change. Test in
consistent environments, run Lighthouse multiple times, and beware of
variability before drawing conclusions about a performance-impacting change.

Read more in our [guide to reducing variability](./docs/variability.md).

### Can I configure the lighthouse run?

Yes! Details in [Lighthouse configuration](./docs/configuration.md).

### How does Lighthouse use network throttling, and how can I make it better?

Good question. Network and CPU throttling are applied by default in a Lighthouse
run. The network attempts to emulate slow 4G connectivity and the CPU is slowed
down 4x from your machine's default speed. If you prefer to run Lighthouse
without throttling, you'll have to use the CLI and disable it with the
`--throttling.*` flags mentioned above.

Read more in our [guide to network throttling](./docs/throttling.md).

### Are results sent to a remote server?

Nope. Lighthouse runs locally, auditing a page using a local version of the
Chrome browser installed on the machine. Report results are never processed or
beaconed to a remote server.

### How do I get localized Lighthouse results via the CLI?

Starting in Lighthouse 8.0, Lighthouse relies entirely on native `Intl` support
and no longer uses an `Intl` polyfill. If you're using Node 14 or later, there
should be no issue because Node is now
[built with `full-icu` by default](https://nodejs.medium.com/node-js-12-to-lts-and-node-js-13-is-here-e28d6a4a2bd#9514).

However, if you're using a `small-icu` Node build, you may see Lighthouse log
messages about your locale not being available. To remedy this, you can manually
install ICU data by using the
[`full-icu`](https://www.npmjs.com/package/full-icu) module and the
[`--icu-data-dir` node flag](https://nodejs.org/api/intl.html#intl_providing_icu_data_at_runtime)
at launch.

### How do I author custom audits to extend Lighthouse?

> **Tip**: see [Lighthouse Architecture](./docs/architecture.md) for more
> information on terminology and architecture.

Lighthouse can be extended to run custom audits and gatherers that you author.
This is great if you're already tracking performance metrics in your site and
want to surface those metrics within a Lighthouse report.

If you're interested in running your own custom audits, check out our
[Custom Audit Example](./docs/recipes/custom-audit) over in recipes.

### How do I contribute?

We'd love help writing audits, fixing bugs, and making the tool more useful! See
[Contributing](./CONTRIBUTING.md) to get started.

---

<p align="center">
  <img src="./assets/lighthouse-logo_512px.png" alt="Lighthouse logo" height="150">
  <br>
  <b>Lighthouse</b>, ˈlītˌhous (n): a <s>tower or other structure</s> tool containing a beacon light
  to warn or guide <s>ships at sea</s> developers.
</p>

</README>

<TypeScript Files>
cli/bin.d.ts
cli/cli-flags.d.ts
cli/commands/commands.d.ts
cli/commands/list-audits.d.ts
cli/commands/list-locales.d.ts
cli/commands/list-trace-categories.d.ts
cli/index.d.ts
cli/printer.d.ts
cli/run.d.ts
cli/sentry-prompt.d.ts
cli/test/smokehouse/config/exclusions.d.ts
cli/test/smokehouse/core-tests.d.ts
cli/test/smokehouse/frontends/back-compat-util.d.ts
cli/test/smokehouse/frontends/lib.d.ts
cli/test/smokehouse/frontends/node.d.ts
cli/test/smokehouse/frontends/smokehouse-bin.d.ts
cli/test/smokehouse/lib/child-process-error.d.ts
cli/test/smokehouse/lib/concurrent-mapper.d.ts
cli/test/smokehouse/lib/local-console.d.ts
cli/test/smokehouse/lighthouse-runners/bundle.d.ts
cli/test/smokehouse/lighthouse-runners/cli.d.ts
cli/test/smokehouse/lighthouse-runners/devtools.d.ts
cli/test/smokehouse/report-assert-test.d.ts
cli/test/smokehouse/report-assert.d.ts
cli/test/smokehouse/smokehouse.d.ts
cli/test/smokehouse/version-check-test.d.ts
cli/test/smokehouse/version-check.d.ts
core/audits/accessibility/accesskeys.d.ts
core/audits/accessibility/aria-allowed-attr.d.ts
core/audits/accessibility/aria-allowed-role.d.ts
core/audits/accessibility/aria-command-name.d.ts
core/audits/accessibility/aria-conditional-attr.d.ts
core/audits/accessibility/aria-deprecated-role.d.ts
core/audits/accessibility/aria-dialog-name.d.ts
core/audits/accessibility/aria-hidden-body.d.ts
core/audits/accessibility/aria-hidden-focus.d.ts
core/audits/accessibility/aria-input-field-name.d.ts
core/audits/accessibility/aria-meter-name.d.ts
core/audits/accessibility/aria-progressbar-name.d.ts
core/audits/accessibility/aria-prohibited-attr.d.ts
core/audits/accessibility/aria-required-attr.d.ts
core/audits/accessibility/aria-required-children.d.ts
core/audits/accessibility/aria-required-parent.d.ts
core/audits/accessibility/aria-roles.d.ts
core/audits/accessibility/aria-text.d.ts
core/audits/accessibility/aria-toggle-field-name.d.ts
core/audits/accessibility/aria-tooltip-name.d.ts
core/audits/accessibility/aria-treeitem-name.d.ts
core/audits/accessibility/aria-valid-attr-value.d.ts
core/audits/accessibility/aria-valid-attr.d.ts
core/audits/accessibility/axe-audit.d.ts
core/audits/accessibility/button-name.d.ts
core/audits/accessibility/bypass.d.ts
core/audits/accessibility/color-contrast.d.ts
core/audits/accessibility/definition-list.d.ts
core/audits/accessibility/dlitem.d.ts
core/audits/accessibility/document-title.d.ts
core/audits/accessibility/duplicate-id-aria.d.ts
core/audits/accessibility/empty-heading.d.ts
core/audits/accessibility/form-field-multiple-labels.d.ts
core/audits/accessibility/frame-title.d.ts
core/audits/accessibility/heading-order.d.ts
core/audits/accessibility/html-has-lang.d.ts
core/audits/accessibility/html-lang-valid.d.ts
core/audits/accessibility/html-xml-lang-mismatch.d.ts
core/audits/accessibility/identical-links-same-purpose.d.ts
core/audits/accessibility/image-alt.d.ts
core/audits/accessibility/image-redundant-alt.d.ts
core/audits/accessibility/input-button-name.d.ts
core/audits/accessibility/input-image-alt.d.ts
core/audits/accessibility/label-content-name-mismatch.d.ts
core/audits/accessibility/label.d.ts
core/audits/accessibility/landmark-one-main.d.ts
core/audits/accessibility/link-in-text-block.d.ts
core/audits/accessibility/link-name.d.ts
core/audits/accessibility/list.d.ts
core/audits/accessibility/listitem.d.ts
core/audits/accessibility/manual/custom-controls-labels.d.ts
core/audits/accessibility/manual/custom-controls-roles.d.ts
core/audits/accessibility/manual/focus-traps.d.ts
core/audits/accessibility/manual/focusable-controls.d.ts
core/audits/accessibility/manual/interactive-element-affordance.d.ts
core/audits/accessibility/manual/logical-tab-order.d.ts
core/audits/accessibility/manual/managed-focus.d.ts
core/audits/accessibility/manual/offscreen-content-hidden.d.ts
core/audits/accessibility/manual/use-landmarks.d.ts
core/audits/accessibility/manual/visual-order-follows-dom.d.ts
core/audits/accessibility/meta-refresh.d.ts
core/audits/accessibility/meta-viewport.d.ts
core/audits/accessibility/object-alt.d.ts
core/audits/accessibility/select-name.d.ts
core/audits/accessibility/skip-link.d.ts
core/audits/accessibility/tabindex.d.ts
core/audits/accessibility/table-duplicate-name.d.ts
core/audits/accessibility/table-fake-caption.d.ts
core/audits/accessibility/target-size.d.ts
core/audits/accessibility/td-has-header.d.ts
core/audits/accessibility/td-headers-attr.d.ts
core/audits/accessibility/th-has-data-cells.d.ts
core/audits/accessibility/valid-lang.d.ts
core/audits/accessibility/video-caption.d.ts
core/audits/audit.d.ts
core/audits/autocomplete.d.ts
core/audits/bf-cache.d.ts
core/audits/bootup-time.d.ts
core/audits/byte-efficiency/byte-efficiency-audit.d.ts
core/audits/byte-efficiency/duplicated-javascript.d.ts
core/audits/byte-efficiency/efficient-animated-content.d.ts
core/audits/byte-efficiency/legacy-javascript.d.ts
core/audits/byte-efficiency/modern-image-formats.d.ts
core/audits/byte-efficiency/offscreen-images.d.ts
core/audits/byte-efficiency/render-blocking-resources.d.ts
core/audits/byte-efficiency/total-byte-weight.d.ts
core/audits/byte-efficiency/unminified-css.d.ts
core/audits/byte-efficiency/unminified-javascript.d.ts
core/audits/byte-efficiency/unused-css-rules.d.ts
core/audits/byte-efficiency/unused-javascript.d.ts
core/audits/byte-efficiency/uses-long-cache-ttl.d.ts
core/audits/byte-efficiency/uses-optimized-images.d.ts
core/audits/byte-efficiency/uses-responsive-images-snapshot.d.ts
core/audits/byte-efficiency/uses-responsive-images.d.ts
core/audits/byte-efficiency/uses-text-compression.d.ts
core/audits/clickjacking-mitigation.d.ts
core/audits/critical-request-chains.d.ts
core/audits/csp-xss.d.ts
core/audits/deprecations.d.ts
core/audits/diagnostics.d.ts
core/audits/dobetterweb/charset.d.ts
core/audits/dobetterweb/doctype.d.ts
core/audits/dobetterweb/dom-size.d.ts
core/audits/dobetterweb/geolocation-on-start.d.ts
core/audits/dobetterweb/inspector-issues.d.ts
core/audits/dobetterweb/js-libraries.d.ts
core/audits/dobetterweb/no-document-write.d.ts
core/audits/dobetterweb/notification-on-start.d.ts
core/audits/dobetterweb/paste-preventing-inputs.d.ts
core/audits/dobetterweb/uses-http2.d.ts
core/audits/dobetterweb/uses-passive-event-listeners.d.ts
core/audits/errors-in-console.d.ts
core/audits/final-screenshot.d.ts
core/audits/font-display.d.ts
core/audits/has-hsts.d.ts
core/audits/image-aspect-ratio.d.ts
core/audits/image-size-responsive.d.ts
core/audits/insights/cls-culprits-insight.d.ts
core/audits/insights/document-latency-insight.d.ts
core/audits/insights/dom-size-insight.d.ts
core/audits/insights/font-display-insight.d.ts
core/audits/insights/forced-reflow-insight.d.ts
core/audits/insights/image-delivery-insight.d.ts
core/audits/insights/insight-audit.d.ts
core/audits/insights/interaction-to-next-paint-insight.d.ts
core/audits/insights/lcp-discovery-insight.d.ts
core/audits/insights/lcp-phases-insight.d.ts
core/audits/insights/long-critical-network-tree-insight.d.ts
core/audits/insights/render-blocking-insight.d.ts
core/audits/insights/slow-css-selector-insight.d.ts
core/audits/insights/third-parties-insight.d.ts
core/audits/insights/viewport-insight.d.ts
core/audits/is-on-https.d.ts
core/audits/largest-contentful-paint-element.d.ts
core/audits/layout-shifts.d.ts
core/audits/lcp-lazy-loaded.d.ts
core/audits/long-tasks.d.ts
core/audits/main-thread-tasks.d.ts
core/audits/mainthread-work-breakdown.d.ts
core/audits/manual/manual-audit.d.ts
core/audits/metrics.d.ts
core/audits/metrics/cumulative-layout-shift.d.ts
core/audits/metrics/first-contentful-paint.d.ts
core/audits/metrics/first-meaningful-paint.d.ts
core/audits/metrics/interaction-to-next-paint.d.ts
core/audits/metrics/interactive.d.ts
core/audits/metrics/largest-contentful-paint.d.ts
core/audits/metrics/max-potential-fid.d.ts
core/audits/metrics/speed-index.d.ts
core/audits/metrics/total-blocking-time.d.ts
core/audits/network-requests.d.ts
core/audits/network-rtt.d.ts
core/audits/network-server-latency.d.ts
core/audits/non-composited-animations.d.ts
core/audits/oopif-iframe-test-audit.d.ts
core/audits/origin-isolation.d.ts
core/audits/predictive-perf.d.ts
core/audits/preload-fonts.d.ts
core/audits/prioritize-lcp-image.d.ts
core/audits/redirects-http.d.ts
core/audits/redirects.d.ts
core/audits/resource-summary.d.ts
core/audits/screenshot-thumbnails.d.ts
core/audits/script-treemap-data.d.ts
core/audits/seo/canonical.d.ts
core/audits/seo/crawlable-anchors.d.ts
core/audits/seo/font-size.d.ts
core/audits/seo/hreflang.d.ts
core/audits/seo/http-status-code.d.ts
core/audits/seo/is-crawlable.d.ts
core/audits/seo/link-text.d.ts
core/audits/seo/manual/structured-data.d.ts
core/audits/seo/meta-description.d.ts
core/audits/seo/robots-txt.d.ts
core/audits/server-response-time.d.ts
core/audits/third-party-cookies.d.ts
core/audits/third-party-facades.d.ts
core/audits/third-party-summary.d.ts
core/audits/unsized-images.d.ts
core/audits/user-timings.d.ts
core/audits/uses-rel-preconnect.d.ts
core/audits/uses-rel-preload.d.ts
core/audits/valid-source-maps.d.ts
core/audits/viewport.d.ts
core/audits/violation-audit.d.ts
core/audits/work-during-interaction.d.ts
core/computed/computed-artifact.d.ts
core/computed/critical-request-chains.d.ts
core/computed/document-urls.d.ts
core/computed/entity-classification.d.ts
core/computed/image-records.d.ts
core/computed/js-bundles.d.ts
core/computed/lcp-image-record.d.ts
core/computed/load-simulator.d.ts
core/computed/main-resource.d.ts
core/computed/main-thread-tasks.d.ts
core/computed/metrics/cumulative-layout-shift.d.ts
core/computed/metrics/first-contentful-paint-all-frames.d.ts
core/computed/metrics/first-contentful-paint.d.ts
core/computed/metrics/interactive.d.ts
core/computed/metrics/lantern-first-contentful-paint.d.ts
core/computed/metrics/lantern-interactive.d.ts
core/computed/metrics/lantern-largest-contentful-paint.d.ts
core/computed/metrics/lantern-max-potential-fid.d.ts
core/computed/metrics/lantern-metric.d.ts
core/computed/metrics/lantern-speed-index.d.ts
core/computed/metrics/lantern-total-blocking-time.d.ts
core/computed/metrics/largest-contentful-paint-all-frames.d.ts
core/computed/metrics/largest-contentful-paint.d.ts
core/computed/metrics/lcp-breakdown.d.ts
core/computed/metrics/max-potential-fid.d.ts
core/computed/metrics/metric.d.ts
core/computed/metrics/navigation-metric.d.ts
core/computed/metrics/responsiveness.d.ts
core/computed/metrics/speed-index.d.ts
core/computed/metrics/time-to-first-byte.d.ts
core/computed/metrics/timing-summary.d.ts
core/computed/metrics/total-blocking-time.d.ts
core/computed/module-duplication.d.ts
core/computed/navigation-insights.d.ts
core/computed/network-analysis.d.ts
core/computed/network-records.d.ts
core/computed/page-dependency-graph.d.ts
core/computed/processed-navigation.d.ts
core/computed/processed-trace.d.ts
core/computed/resource-summary.d.ts
core/computed/screenshots.d.ts
core/computed/speedline.d.ts
core/computed/tbt-impact-tasks.d.ts
core/computed/trace-engine-result.d.ts
core/computed/unused-css.d.ts
core/computed/unused-javascript-summary.d.ts
core/computed/user-timings.d.ts
core/computed/viewport-meta.d.ts
core/config/config-helpers.d.ts
core/config/config-plugin.d.ts
core/config/config.d.ts
core/config/constants.d.ts
core/config/default-config.d.ts
core/config/desktop-config.d.ts
core/config/experimental-config.d.ts
core/config/filters.d.ts
core/config/full-config.d.ts
core/config/lr-desktop-config.d.ts
core/config/lr-mobile-config.d.ts
core/config/perf-config.d.ts
core/config/validation.d.ts
core/gather/base-artifacts.d.ts
core/gather/base-gatherer.d.ts
core/gather/driver.d.ts
core/gather/driver/dom.d.ts
core/gather/driver/environment.d.ts
core/gather/driver/execution-context.d.ts
core/gather/driver/navigation.d.ts
core/gather/driver/network-monitor.d.ts
core/gather/driver/network.d.ts
core/gather/driver/prepare.d.ts
core/gather/driver/storage.d.ts
core/gather/driver/target-manager.d.ts
core/gather/driver/wait-for-condition.d.ts
core/gather/fetcher.d.ts
core/gather/gatherers/accessibility.d.ts
core/gather/gatherers/anchor-elements.d.ts
core/gather/gatherers/bf-cache-failures.d.ts
core/gather/gatherers/cache-contents.d.ts
core/gather/gatherers/console-messages.d.ts
core/gather/gatherers/css-usage.d.ts
core/gather/gatherers/devtools-log-compat.d.ts
core/gather/gatherers/devtools-log.d.ts
core/gather/gatherers/dobetterweb/doctype.d.ts
core/gather/gatherers/dobetterweb/domstats.d.ts
core/gather/gatherers/dobetterweb/optimized-images.d.ts
core/gather/gatherers/dobetterweb/response-compression.d.ts
core/gather/gatherers/full-page-screenshot.d.ts
core/gather/gatherers/iframe-elements.d.ts
core/gather/gatherers/image-elements.d.ts
core/gather/gatherers/inputs.d.ts
core/gather/gatherers/inspector-issues.d.ts
core/gather/gatherers/js-usage.d.ts
core/gather/gatherers/link-elements.d.ts
core/gather/gatherers/main-document-content.d.ts
core/gather/gatherers/meta-elements.d.ts
core/gather/gatherers/network-user-agent.d.ts
core/gather/gatherers/scripts.d.ts
core/gather/gatherers/seo/font-size.d.ts
core/gather/gatherers/seo/robots-txt.d.ts
core/gather/gatherers/source-maps.d.ts
core/gather/gatherers/stacks.d.ts
core/gather/gatherers/stylesheets.d.ts
core/gather/gatherers/trace-compat.d.ts
core/gather/gatherers/trace-elements.d.ts
core/gather/gatherers/trace.d.ts
core/gather/gatherers/viewport-dimensions.d.ts
core/gather/navigation-runner.d.ts
core/gather/runner-helpers.d.ts
core/gather/session.d.ts
core/gather/snapshot-runner.d.ts
core/gather/timespan-runner.d.ts
core/index.d.ts
core/lib/arbitrary-equality-map.d.ts
core/lib/asset-saver.d.ts
core/lib/axe.d.ts
core/lib/bf-cache-strings.d.ts
core/lib/cdt/Common.d.ts
core/lib/cdt/Platform.d.ts
core/lib/cdt/SDK.d.ts
core/lib/cdt/generated/ParsedURL.d.ts
core/lib/cdt/generated/SourceMap.d.ts
core/lib/csp-evaluator.d.ts
core/lib/deprecation-description.d.ts
core/lib/deprecations-strings.d.ts
core/lib/emulation.d.ts
core/lib/i18n/i18n.d.ts
core/lib/icons.d.ts
core/lib/lantern-trace-saver.d.ts
core/lib/lantern/lantern.d.ts
core/lib/lh-env.d.ts
core/lib/lh-error.d.ts
core/lib/lh-trace-processor.d.ts
core/lib/lighthouse-compatibility.d.ts
core/lib/manifest-parser.d.ts
core/lib/median-run.d.ts
core/lib/minification-estimator.d.ts
core/lib/minify-devtoolslog.d.ts
core/lib/navigation-error.d.ts
core/lib/network-recorder.d.ts
core/lib/network-request.d.ts
core/lib/page-functions.d.ts
core/lib/polyfill-dom-rect.d.ts
core/lib/proto-preprocessor.d.ts
core/lib/rect-helpers.d.ts
core/lib/script-helpers.d.ts
core/lib/sentry.d.ts
core/lib/stack-packs.d.ts
core/lib/tappable-rects.d.ts
core/lib/third-party-web.d.ts
core/lib/timing-trace-saver.d.ts
core/lib/trace-engine.d.ts
core/lib/tracehouse/cpu-profile-model.d.ts
core/lib/tracehouse/main-thread-tasks.d.ts
core/lib/tracehouse/task-groups.d.ts
core/lib/tracehouse/task-summary.d.ts
core/lib/tracehouse/trace-processor.d.ts
core/lib/traces/metric-trace-events.d.ts
core/lib/url-utils.d.ts
core/runner.d.ts
core/scoring.d.ts
core/user-flow.d.ts
flow-report/api.d.ts
flow-report/api.ts
flow-report/clients/standalone.d.ts
flow-report/clients/standalone.ts
flow-report/src/app.d.ts
flow-report/src/common.d.ts
flow-report/src/header.d.ts
flow-report/src/help-dialog.d.ts
flow-report/src/i18n/i18n.d.ts
flow-report/src/i18n/localized-strings.d.ts
flow-report/src/i18n/ui-strings.d.ts
flow-report/src/icons.d.ts
flow-report/src/sidebar/flow.d.ts
flow-report/src/sidebar/sidebar.d.ts
flow-report/src/summary/category.d.ts
flow-report/src/summary/summary.d.ts
flow-report/src/topbar.d.ts
flow-report/src/util.d.ts
flow-report/src/util.ts
flow-report/src/wrappers/category-score.d.ts
flow-report/src/wrappers/markdown.d.ts
flow-report/src/wrappers/report.d.ts
flow-report/src/wrappers/styles.d.ts
flow-report/types/flow-report.d.ts
report/clients/bundle.d.ts
report/clients/standalone.d.ts
report/generator/file-namer.d.ts
report/generator/flow-report-assets.d.ts
report/generator/report-assets.d.ts
report/generator/report-generator.d.ts
report/renderer/api.d.ts
report/renderer/category-renderer.d.ts
report/renderer/components.d.ts
report/renderer/crc-details-renderer.d.ts
report/renderer/details-renderer.d.ts
report/renderer/dom.d.ts
report/renderer/drop-down-menu.d.ts
report/renderer/element-screenshot-renderer.d.ts
report/renderer/explodey-gauge.d.ts
report/renderer/features-util.d.ts
report/renderer/i18n-formatter.d.ts
report/renderer/logger.d.ts
report/renderer/open-tab.d.ts
report/renderer/performance-category-renderer.d.ts
report/renderer/report-globals.d.ts
report/renderer/report-renderer.d.ts
report/renderer/report-ui-features.d.ts
report/renderer/report-utils.d.ts
report/renderer/snippet-renderer.d.ts
report/renderer/swap-locale-feature.d.ts
report/renderer/text-encoding.d.ts
report/renderer/topbar-features.d.ts
report/types/augment-dom.d.ts
report/types/buffer.d.ts
report/types/html-renderer.d.ts
report/types/report-renderer.d.ts
report/types/report-result.d.ts
shared/esm-utils.d.ts
shared/localization/format.d.ts
shared/localization/i18n-module.d.ts
shared/localization/locales.d.ts
shared/localization/swap-flow-locale.d.ts
shared/localization/swap-locale.d.ts
shared/root.d.ts
shared/statistics.d.ts
shared/type-verifiers.d.ts
shared/types/shared.d.ts
shared/util.d.ts
third-party/axe/valid-langs.d.ts
third-party/esbuild-plugins-polyfills/esbuild-polyfills.d.ts
types/artifacts.d.ts
types/audit.d.ts
types/config.d.ts
types/externs.d.ts
types/gatherer.d.ts
types/internal/cssstyle.d.ts
types/internal/enquirer.d.ts
types/internal/global.d.ts
types/internal/http-link-header.d.ts
types/internal/jsonlint-mod.d.ts
types/internal/lookup-closest-locale.d.ts
types/internal/metaviewport-parser.d.ts
types/internal/node-fetch.d.ts
types/internal/node.d.ts
types/internal/parse-cache-control.d.ts
types/internal/pretty-json-stringify.d.ts
types/internal/query-selector.d.ts
types/internal/rollup-plugin-postprocess.d.ts
types/internal/rxjs.d.ts
types/internal/smokehouse.d.ts
types/internal/test.d.ts
types/lh.d.ts
types/lhr/audit-details.d.ts
types/lhr/audit-result.d.ts
types/lhr/flow-result.d.ts
types/lhr/i18n.d.ts
types/lhr/lhr.d.ts
types/lhr/settings.d.ts
types/lhr/treemap.d.ts
types/protocol.d.ts
types/puppeteer.d.ts
types/user-flow.d.ts
types/utility-types.d.ts

Total TypeScript files: 478 </TypeScript Files>
