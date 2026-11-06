# Browser Mobile

Responsive layout widths for the built-in BB desktop browser.

[Русская инструкция](README.ru.md)

## Install

Requires **BB desktop 0.48.1 or newer**. In a terminal on the computer running BB:

```sh
bb plugin install https://github.com/VyacheslavTeplyakov/bb-plugin-browser-mobile
```

Confirm the source, then open or reopen a Browser tab in BB. Click the width control beside the address bar to choose a phone, tablet or desktop width. No separate `npm install` is needed.

### Download a ZIP instead

1. Download `browser-mobile-0.3.1.zip` from [Releases](https://github.com/VyacheslavTeplyakov/bb-plugin-browser-mobile/releases/latest) and extract it into a permanent directory. BB will keep loading the plugin from that directory.
2. Open a terminal in the directory containing `bb-plugin-browser-mobile`.
3. Run:

```sh
bb plugin install ./bb-plugin-browser-mobile
```

Review and confirm the local source. Open a Browser tab in BB. The viewport control appears beside the address bar; reopen an existing Browser tab if necessary.

BB builds the plugin with its own toolchain; its first build may download that toolchain.

## Use

Click the toolbar control and choose a width:

| Preset | CSS px |
| --- | ---: |
| Full panel | Auto |
| Small phone | 360 |
| Phone | 390 |
| Large phone | 430 |
| Tablet | 768 |
| Laptop / landscape tablet | 1024 |
| Desktop | 1280 |

The menu opens over the website inside its viewport, uses the BB theme, and supports arrow keys, Home, End, Enter and Escape. It stays within the website viewport, including in narrow phone mode. Menu labels are currently in Russian.

The browser viewport changes size, so the website's media queries respond. Height follows the available panel height. The width choice lasts for the mounted tab and survives navigation and page reloads.

If the panel is narrower than a preset, the actual width is shown with an asterisk. For example, a 1280 px preset in a 600 px panel still gives a 600 px viewport. Widen the panel to test the intended breakpoint.

## Compatibility and limits

- Requires BB desktop 0.48.1+ and Plugin SDK 0.6.104+; verified with BB 0.48.1.
- Works in native Browser tabs, not chat headless previews or web clients without a native browser.
- Does not emulate touch, DPR or mobile User-Agent, and does not add DevTools.
- Uses BB's experimental browser toolbar API and its browser layout DOM. Future BB updates may require a compatibility fix; the control disables itself if the expected layout is absent.
- The menu appears inside the website viewport. Opening it does not move or resize the page, hide its live content, or substitute a screenshot.

No account, API key or external service is required. The plugin adds no telemetry. It changes only the current browser tab's width and adds a temporary menu inside an isolated Shadow DOM in that page. The menu and its listeners are removed on dismissal. No screenshot capture or page hiding is used. Disabling or reloading the plugin restores its width changes.

## Disable or remove

```sh
bb plugin disable browser-mobile
```

You can also manage it in BB's plugin settings.

## Develop

```sh
npm ci --include=dev
npm run typecheck
npm test
bb plugin build
```

The SDK, React and Sonner are supplied by BB at runtime. Build the plugin with a compatible BB release before distributing it. The release ZIP includes sources and prebuilt `dist/` artifacts.

## License

MIT. See [LICENSE](LICENSE).
